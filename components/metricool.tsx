import Script from 'next/script'

const METRICOOL_HASH = 'b03a86e770773809384ad9b7256a5bd'

export function Metricool() {
  return (
    <Script id="metricool-tracker" strategy="afterInteractive">
      {`function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"${METRICOOL_HASH}"})});`}
    </Script>
  )
}
