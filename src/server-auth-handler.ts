import { auth } from "./lib/auth";
import { defineEventHandler, toRequest, sendWebResponse } from "h3";

export default defineEventHandler(async (event) => {
  const request = toRequest(event);
  const response = await auth.handler(request);
  return sendWebResponse(event, response);
});
