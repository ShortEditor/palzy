// Palzy — Weekly Recap Card Generator
// Renders a 1080x1080 canvas card showing the user"s week stats
// Returns a PNG data URL (lossless, owner-downloadable)

const W = 1080, H = 1080

export async function renderRecapCard({ name, username, photoURL, stats }) {
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")

  // ── Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, "#0f0f1a")
  bg.addColorStop(0.5, "#1a0a2e")
  bg.addColorStop(1, "#0d1a2e")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // ── Noise overlay for premium texture
  const imageData = ctx.getImageData(0, 0, W, H)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18
    data[i]     = Math.min(255, Math.max(0, data[i]     + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)

  // ── Glow circles
  const glow = ctx.createRadialGradient(200, 200, 0, 200, 200, 400)
  glow.addColorStop(0, "rgba(124,77,255,0.25)")
  glow.addColorStop(1, "transparent")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  const glow2 = ctx.createRadialGradient(900, 800, 0, 900, 800, 360)
  glow2.addColorStop(0, "rgba(11,197,222,0.18)")
  glow2.addColorStop(1, "transparent")
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, H)

  // ── Palzy wordmark
  ctx.font = "700 52px Baloo 2, Inter, sans-serif"
  ctx.fillStyle = "rgba(255,255,255,0.15)"
  ctx.fillText("palzy", 60, 90)

  // ── "Your Week" label
  ctx.font = "500 34px Inter, sans-serif"
  ctx.fillStyle = "rgba(255,255,255,0.55)"
  ctx.fillText("Your Week on Palzy", 60, 180)

  // ── Avatar
  if (photoURL) {
    try {
      const img = await loadImage(photoURL)
      ctx.save()
      ctx.beginPath()
      ctx.arc(120, 310, 70, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 50, 240, 140, 140)
      ctx.restore()
    } catch {}
  }

  // ── Name + handle
  ctx.font = "700 54px Baloo 2, Inter, sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(name, 220, 310)

  ctx.font = "400 34px Inter, sans-serif"
  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.fillText(`@${username}`, 222, 355)

  // ── Divider
  ctx.beginPath()
  ctx.moveTo(60, 420)
  ctx.lineTo(W - 60, 420)
  ctx.strokeStyle = "rgba(255,255,255,0.08)"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // ── Stats grid (2x2)
  const statItems = [
    { label: "Posts", value: stats.postCount, icon: "✦", color: "#a078ff" },
    { label: "Likes Received", value: stats.likesReceived, icon: "♥", color: "#e91e8c" },
    { label: "Streak", value: `${stats.streakCount} days`, icon: "🔥", color: "#f97316" },
    { label: "New Followers", value: stats.newFollowers, icon: "✺", color: "#0bc5de" },
  ]

  const cols = 2
  const cellW = (W - 120) / cols
  const cellH = 200
  const startY = 460

  statItems.forEach((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 60 + col * cellW
    const y = startY + row * (cellH + 30)

    // Cell background
    ctx.fillStyle = "rgba(255,255,255,0.04)"
    roundRect(ctx, x, y, cellW - 20, cellH, 28)
    ctx.fill()

    // Icon
    ctx.font = "48px serif"
    ctx.fillText(s.icon, x + 28, y + 68)

    // Value
    ctx.font = `700 72px Baloo 2, Inter, sans-serif`
    ctx.fillStyle = s.color
    ctx.fillText(String(s.value ?? 0), x + 28, y + 148)

    // Label
    ctx.font = "400 28px Inter, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.45)"
    ctx.fillText(s.label, x + 28, y + 185)
  })

  // ── Watermark
  ctx.font = "600 26px Baloo 2, Inter, sans-serif"
  ctx.fillStyle = "rgba(255,255,255,0.25)"
  ctx.textAlign = "center"
  ctx.fillText("palzy.app", W / 2, H - 50)

  return canvas.toDataURL("image/png")
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
