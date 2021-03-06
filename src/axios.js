import axios from "axios";

const baseURL = "https://securerankedchoicebackend.herokuapp.com/api/";

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 5000,
  headers: {
    Authorization: localStorage.getItem("access_token")
      ? "JWT " + localStorage.getItem("access_token")
      : null,
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;

    if (typeof error.response === "undefined") {
      alert(
        "A server/network error occurred. " +
          "Looks like CORS might be the problem. " +
          "Sorry about this - we will get it fixed shortly."
      );
      return Promise.reject(error);
    }

    if (error.response.status === 404) {
      window.location.href = "/page-not-found/";
    }

    if (
      error.response.status === 401 &&
      originalRequest.url === baseURL + "token/refresh/"
    ) {
      window.location.href = "/login/";
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      error.response.statusText === "Unauthorized"
    ) {
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        const tokenParts = JSON.parse(atob(refreshToken.split(".")[1]));

        // exp date in token is expressed in seconds, while now() returns milliseconds:
        const now = Math.ceil(Date.now() / 1000);

        if (tokenParts.exp > now) {
          return axiosInstance
            .post("/token/refresh/", { refresh: refreshToken })
            .then((response) => {
              if (response.data.access) {
                localStorage.setItem("access_token", response.data.access);
                axiosInstance.defaults.headers["Authorization"] =
                  "JWT " + response.data.access;
                originalRequest.headers["Authorization"] =
                  "JWT " + response.data.access;
              }
              if (response.data.refresh) {
                localStorage.setItem("refresh_token", response.data.refresh);
              }
              return axiosInstance(originalRequest);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          console.log("Refresh token is expired", tokenParts.exp, now);
          if (window.location.pathname !== "/login/") {
            window.location.href = "/login/";
          }
        }
      } else {
        console.log("Refresh token not available.");
        if (window.location.pathname !== "/login/") {
          window.location.href = "/login/";
        }
      }
    }

    // specific error handling done elsewhere
    return Promise.reject(error);
  }
);

export default axiosInstance;
