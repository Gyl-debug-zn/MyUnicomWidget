export default async function(ctx) {
  const cookie = ctx.env.Cookie || "";
  const phone = ctx.env.手机号 || "";

  const colors = {
    bg: { light: "#FFFFFF", dark: "#1C1C1E" },
    card: { light: "#F2F2F7", dark: "#2C2C2E" },
    text: { light: "#1C1C1E", dark: "#FFFFFF" },
    subText: { light: "#8E8E93", dark: "#8E8E93" },
    red: "#FF3B30",
    orange: "#FF9500",
    green: "#34C759",
    blue: "#007AFF",
  };

  function getColor(percent) {
    if (percent < 20) return colors.red;
    if (percent < 50) return colors.orange;
    return colors.green;
  }

  function formatFlow(value, unit) {
    let v = Number(value) || 0;
    if (unit === "GB") return { value: v.toFixed(2), unit };
    if (v > 1024) return { value: (v / 1024).toFixed(2), unit: "GB" };
    return { value: v.toFixed(0), unit: "MB" };
  }

  let data = {
    fee: { title: "话费", value: 0, unit: "元", used: 0, percent: 100 },
    voice: { title: "语音", value: 0, unit: "分钟", used: 0, percent: 100 },
    flow: { title: "流量", value: 0, unit: "MB", used: 0, percent: 100 },
    time: "--:--",
    error: null,
  };

  if (!cookie || !phone) {
    data.error = "请在小组件配置页添加 Cookie 和手机号";
  } else {
    try {
      const url = `https://m.client.10010.com/mobileserviceimportant/home/queryUserInfoSeven?version=iphone_c@10.0100&desmobiel=${phone}&showType=0`;
      const res = await ctx.http.get(url, {
        timeout: 8000,
        headers: { "cookie": cookie, "User-Agent": "ChinaUnicom.x", "Referer": "https://m.client.10010.com" }
      });
      const json = await res.json();

      if (json?.code === "Y") {
        let feeVal = Number(json.feeResource?.feePersent) || 0;
        let feeUsed = Number(json.feeResource?.feeUsed) || 0;
        data.fee = { title: "话费", value: feeVal.toFixed(1), unit: json.feeResource?.newUnit || "元", used: feeUsed.toFixed(1), percent: feeVal };

        let voiceVal = Number(json.voiceResource?.voicePersent) || 0;
        let voiceUsed = Number(json.voiceResource?.voiceUsed) || 0;
        data.voice = { title: "语音", value: voiceVal.toFixed(0), unit: json.voiceResource?.newUnit || "分钟", used: voiceUsed.toFixed(0), percent: voiceVal };

        let flowRaw = Number(json.flowResource?.flowPersent) || 0;
        let flowUsed = Number(json.flowResource?.flowUsed) || 0;
        let flowUnit = json.flowResource?.newUnit || "MB";
        let f = formatFlow(flowRaw, flowUnit);
        let usedF = formatFlow(flowUsed, flowUnit);
        data.flow = { title: "流量", value: f.value, unit: f.unit, used: usedF.value, percent: flowRaw };

        data.time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });
      } else data.error = "Cookie 可能已过期或接口异常";
    } catch (e) { data.error = "请求失败：" + e.message; }
  }

  if (data.error) return { type: "widget", backgroundColor: colors.bg, padding: 12, children: [
      { type: "text", text: "联通小组件异常", font: { size: "headline", weight: "semibold" }, textColor: colors.red },
      { type: "text", text: data.error, font: { size: "caption1" }, textColor: colors.subText }
    ] };

  function makeCard(item) {
    const color = getColor(item.percent);
    const percent = isNaN(item.percent) ? 0 : Math.min(item.percent, 100);
    return { type: "stack", direction: "column", backgroundColor: colors.card, borderRadius: 16, padding: 10, gap: 6, children: [
      { type: "text", text: item.title, font: { size: "caption1" }, textColor: colors.subText },
      { type: "stack", direction: "row", alignItems: "end", children: [
        { type: "text", text: item.value, font: { size: "title1", weight: "bold" }, textColor: colors.text },
        { type: "text", text: ` ${item.unit}`, font: { size: "caption2" }, textColor: colors.subText }
      ] },
      { type: "text", text: `已用：${item.used} ${item.unit}`, font: { size: "caption2" }, textColor: colors.subText },
      { type: "stack", height: 4, backgroundColor: "#E5E5EA", borderRadius: 2, children: [
        { type: "stack", width: `${percent}%`, backgroundColor: color, borderRadius: 2 }
      ] }
    ] };
  }

  return { type: "widget", backgroundColor: colors.bg, padding: 12, gap: 10, refreshAfter: new Date(Date.now() + 3600*1000).toISOString(), children: [
    { type: "stack", direction: "row", children: [
      { type: "text", text: `📶 中国联通 · ${phone.slice(-4)}`, font: { size: "headline", weight: "semibold" }, textColor: colors.text },
      { type: "spacer" },
      { type: "text", text: data.time, font: { size: "caption2" }, textColor: colors.subText }
    ] },
    { type: "stack", direction: "row", gap: 8, children: [ makeCard(data.fee), makeCard(data.voice), makeCard(data.flow) ] }
  ] };
}
