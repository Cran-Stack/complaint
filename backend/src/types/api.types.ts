export interface ApiResponse<T> {
    data?: T | null;
    status: "success" | "error" | "failed";
    message: string;
}