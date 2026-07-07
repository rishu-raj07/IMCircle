import api from "./axios";

/*
|--------------------------------------------------------------------------
| Email Authentication
|--------------------------------------------------------------------------
*/

export const registerUser = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const verifyOtp = async (data) => {
  const res = await api.post("/auth/verify-otp", data);
  return res.data;
};

export const resendOtp = async (data) => {
  const res = await api.post("/auth/resend-otp", data);
  return res.data;
};

/*
|--------------------------------------------------------------------------
| Mobile Authentication
|--------------------------------------------------------------------------
*/

export const sendMobileOtp = async (data) => {
  const res = await api.post("/auth/mobile/send-otp", data);
  return res.data;
};

export const verifyMobileOtp = async (data) => {
  const res = await api.post("/auth/mobile/verify-otp", data);
  return res.data;
};

/*
|--------------------------------------------------------------------------
| Google Authentication
|--------------------------------------------------------------------------
*/

export const googleLogin = async (data) => {
  const res = await api.post("/auth/google", data);
  return res.data;
};

/*
|--------------------------------------------------------------------------
| User
|--------------------------------------------------------------------------
*/

export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const logoutApi = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};