export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "NexusG_Cidef",
    ts: new Date().toISOString(),
  });
}
