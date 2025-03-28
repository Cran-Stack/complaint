import { Response } from 'express';
import { ApiResponse } from '../types/api.types';


export async function sendResponse<T>(res: Response, response: ApiResponse<T>, statusCode: number = 200){
  if (typeof response.status !== "string" || typeof response.message !== "string") {
    throw new Error("Response does not match the ApiResponse contract");
  }
  if (response.data && typeof(response.data) === "object" && "password" in response.data){
      delete response.data.password
  }

  if (!response.data) response.data = null
  return res.status(statusCode).json(response);
}



