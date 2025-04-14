import { NextRequest, NextResponse } from 'next/server';

// Default ElevenLabs voice ID - Josh (male)
const voiceId = 'TxGEqnHWrfWFTfGW9XjX';

export async function POST(request: NextRequest) {
  // Get API key from environment variable
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

  if (!elevenlabsApiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured" },
      { status: 500 }
    );
  }

  try {
    // Get the request body
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenlabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs API error: ${errorText}` },
        { status: response.status }
      );
    }

    // Get the audio data as an array buffer
    const audioArrayBuffer = await response.arrayBuffer();

    // Return the audio data with the appropriate headers
    return new NextResponse(audioArrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioArrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error in TTS API:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
} 