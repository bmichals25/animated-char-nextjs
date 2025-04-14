import { NextRequest, NextResponse } from 'next/server';

// Use the voice ID from environment variable or fall back to default voice
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'TxGEqnHWrfWFTfGW9XjX';

export async function POST(request: NextRequest) {
  // Get API key from environment variable
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
  // Check if we should use mock implementation
  const useMocks = process.env.USE_LIPSYNC_MOCKS === 'true';

  if (!elevenlabsApiKey && !useMocks) {
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

    // Use the standard TTS endpoint for audio generation
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          ...(elevenlabsApiKey ? { "xi-api-key": elevenlabsApiKey } : {})
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

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      return NextResponse.json(
        { error: `ElevenLabs TTS API error: ${errorText}` },
        { status: ttsResponse.status }
      );
    }

    // Get the audio data
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    
    // Create a mock alignment data object that provides timing information
    // This is a fallback while we figure out the proper API for alignment
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = wordCount * 0.5; // Rough estimate: 0.5 seconds per word
    const mockAlignmentData = {
      text: text,
      duration: estimatedDuration * 1000, // in milliseconds
      words: text.split(/\s+/).map((word: string, index: number) => {
        const startTime = (index * estimatedDuration) / wordCount;
        const endTime = ((index + 1) * estimatedDuration) / wordCount;
        return {
          word: word,
          start: startTime,
          end: endTime
        };
      })
    };

    // Try to get alignment data using the forced alignment API
    let alignmentData = mockAlignmentData;
    try {
      // Convert audio to base64 for the API request
      const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
      
      const alignmentResponse = await fetch(
        `https://api.elevenlabs.io/v1/speech-to-text/forced-alignment`,
        {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            ...(elevenlabsApiKey ? { "xi-api-key": elevenlabsApiKey } : {})
          },
          body: JSON.stringify({
            text: text,
            audio_base64: audioBase64
          })
        }
      );

      if (alignmentResponse.ok) {
        alignmentData = await alignmentResponse.json();
        console.log("Received alignment data:", alignmentData);
      } else {
        const errorText = await alignmentResponse.text();
        console.warn("Failed to get alignment data:", errorText);
      }
    } catch (alignmentError) {
      console.error("Error fetching alignment data:", alignmentError);
    }

    // Return audio data with alignment data in header if available
    return new Response(audioArrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioArrayBuffer.byteLength.toString(),
        "X-Alignment-Data": JSON.stringify(alignmentData),
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