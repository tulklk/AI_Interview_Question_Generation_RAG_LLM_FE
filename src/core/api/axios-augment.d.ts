import "axios";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    /** Set by response interceptor when retrying after refresh */
    _retry?: boolean;
  }
}
