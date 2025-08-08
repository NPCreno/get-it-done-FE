export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT:", e);
    return null;
  }
}

export function base64UrlDecode(str: string) {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + (4 - (str.length % 4)) % 4, "="));
}

export const getAccessToken = () => {
  const value = document.cookie
    .split('; ')
    .find(row => row.startsWith('access_token='))
    ?.split('=')[1];
  return value || null;
};

export function getWeekRange(startDate: string) {
  const date = new Date(startDate);
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)

  // Adjust to Monday (day 1)
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);

  // End of the week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0],
  };
}

export const getIPAddress = async (): Promise<string> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return "";
  }
};