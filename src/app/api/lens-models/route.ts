import { NextResponse } from 'next/server';
import { getExifSuggestions } from '@/lib/actions/photos';

export async function GET() {
  const suggestions = await getExifSuggestions();
  if (suggestions.success) {
    return NextResponse.json({ lensModels: suggestions.data.lensModels });
  }
  return NextResponse.json({ lensModels: [] }, { status: 500 });
}
