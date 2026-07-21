import { NextResponse } from 'next/server';
import { getExifSuggestions } from '@/lib/actions/photos';

export async function GET() {
  const suggestions = await getExifSuggestions();
  if (suggestions.success) {
    return NextResponse.json({ success: true, data: suggestions.data });
  }
  return NextResponse.json({ success: false, error: suggestions.error, data: { models: [], lensModels: [] } }, { status: 500 });
}
