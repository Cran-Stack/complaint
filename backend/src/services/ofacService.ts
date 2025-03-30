import { config } from "./../../config/commons";
import { ApiResponse } from "../types/api.types";

interface OFACRequest {
  apiKey: string;
  minScore: number;
  sources: string[];
  cases: { name: string; externalId: string }[];
}

interface OFACResponse {
  error: boolean;
  results?: {
    name: string;
    matchCount: number;
    matches: {
      score: number;
      matchSummary: {
        matchFields: {
          similarity: string;
          fieldName: string;
          caseField: string;
          sanctionField: string;
          sanctionFieldNote: string;
        }[];
      };
    }[];
  }[];
}

class OFACService {
  private OFAC_SCREEN: string;
  private API_KEY: string;
  private MIN_SCORE: number;
  private SOURCES: string[];

  constructor() {
    if (!config.OFAC_API_URL || !config.OFAC_API_KEY) {
      throw new Error("OFAC API configuration is missing in environment variables.");
    }

    this.OFAC_SCREEN = config.OFAC_API_URL;
    this.API_KEY = config.OFAC_API_KEY;
    this.MIN_SCORE = 95;
    this.SOURCES = ["sdn", "nonsdn", "un", "ofsi", "eu", "dpl", "sema", "bfs", "mxsat", "lfiu"];
  }

  async screenName(name: string): Promise<ApiResponse<{ matchCount: number; score: number; similarity: string }>> {
    try {
      const requestData: OFACRequest = {
        apiKey: this.API_KEY,
        minScore: this.MIN_SCORE,
        sources: this.SOURCES,
        cases: [
          {
            name,
            externalId: this.generateRandomId(),
          },
        ],
      };

      const response = await fetch(`${this.OFAC_SCREEN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`OFAC API Request Failed: ${response.statusText}`);
      }

      const data: OFACResponse = await response.json();

      let matchCount = 0;
      let score = 0;
      let similarity = "weak";

      if (!data.error && data.results && data.results.length > 0) {
        const firstMatch = data.results[0];
        matchCount = firstMatch.matchCount ?? 0;

        if (firstMatch.matches && firstMatch.matches.length > 0) {
          score = firstMatch.matches[0].score ?? 0;
          similarity = firstMatch.matches[0].matchSummary.matchFields[0]?.similarity || "weak";
        }
      }

      return {
        data: { matchCount, score, similarity },
        status: "success",
        message: "OFAC compliance check completed successfully.",
      };
    } catch (error: any) {
      console.error("OFAC API Request Failed:", error.message);

      return {
        data: { matchCount: 0, score: 0, similarity: "weak" },
        status: "failed",
        message: "Failed to fetch compliance data from OFAC.",
      };
    }
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}

export default new OFACService();
