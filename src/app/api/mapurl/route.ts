export async function POST(req: Request) {
  const { address } = await req.json();

  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(address)}`;

  return Response.json({ mapUrl });
}
