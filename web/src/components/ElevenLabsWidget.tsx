import Script from 'next/script';

/** ElevenLabs Conversational AI web widget (floating button, rendered by their web component). */
export function ElevenLabsWidget({ agentId }: { agentId: string }) {
  return (
    <>
      <elevenlabs-convai agent-id={agentId} />
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" async />
    </>
  );
}
