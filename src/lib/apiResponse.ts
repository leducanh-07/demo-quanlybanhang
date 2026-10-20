import { NextResponse } from "next/server";

export function jsonSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(message: string, status: number = 400, errors?: any) {
  return NextResponse.json(
    { success: false, error: message, ...(errors ? { errors } : {}) },
    { status }
  );
}
