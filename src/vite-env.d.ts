/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** JSON array of RTCIceServer, e.g. Metered's "ICE Servers Array". */
  readonly VITE_ICE_SERVERS?: string
}
