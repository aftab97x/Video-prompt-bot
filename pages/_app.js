import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="color-scheme" content="dark light" />
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <title>Video Prompt Generator</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
    }
