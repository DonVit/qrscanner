export const manifest = {
  name: "QR Scanner App",
  short_name: "QRScanner",
  description: "Scan QR codes quickly and easily.",
  start_url: ".",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0078d7",
  orientation: "portrait-primary",
  icons: [
    {
      src: "/qrscanner/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/qrscanner/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};
