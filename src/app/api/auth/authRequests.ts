import { NextResponse } from "next/server";

// Helper function to refresh token
export async function refreshAccessToken(refreshToken: string, ipAddress: string) {
  try {
    console.log("Attempting to refresh token...");
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken, ipAddress }),
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json() as {
        status: string;
        message: string;
        data?: {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };
      };
      
      if (data.data?.access_token) {
        console.log("Successfully refreshed token, setting new cookies");
        
        const response = NextResponse.next();
        
        // Calculate expiry date (expires_in is typically in seconds)
        const expiryDate = new Date(Date.now() + (data.data.expires_in * 1000));
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        response.cookies.set("refresh_token", data.data.refresh_token, {
          expires: expiryDate,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          httpOnly: true,
        });
        response.cookies.set("access_token", data.data.access_token, {
          expires: expiryDate,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          httpOnly: true,
        });

        // console.log("New access token set, continuing to protected route");
        return response;
      }
    }
    
    console.log("Refresh token request failed");
    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}