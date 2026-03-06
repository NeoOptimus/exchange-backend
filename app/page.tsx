"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function HomePage() {
const router = useRouter();
const [mode, setMode] = useState<"login" | "register">("login");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("+996");
const [password, setPassword] = useState("");
const [msg, setMsg] = useState("");

const onRegister = async () => {
try {
await API.post("/auth/register", { email, phone, password });
setMsg("Регистрация успешна. Теперь войди.");
setMode("login");
} catch (e: any) {
setMsg(e?.response?.data?.error || "Ошибка регистрации");
}
};

const onLogin = async () => {
try {
const { data } = await API.post("/auth/login", {
email_or_phone: email || phone,
password,
});
setToken(data.access_token);
router.push("/dashboard");
} catch (e: any) {
setMsg(e?.response?.data?.error || "Ошибка входа");
}
};

return (
<main style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
<h1>Crypto Exchange MVP</h1>

<div style={{ marginBottom: 16 }}>
<button onClick={() => setMode("login")}>Login</button>
<button onClick={() => setMode("register")} style={{ marginLeft: 8 }}>
Register
</button>
</div>

<div style={{ display: "grid", gap: 8 }}>
<input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
<input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
<input
type="password"
placeholder="Password"
value={password}
onChange={(e) => setPassword(e.target.value)}
/>

{mode === "register" ? (
<button onClick={onRegister}>Создать аккаунт</button>
) : (
<button onClick={onLogin}>Войти</button>
)}
</div>

{msg && <p style={{ marginTop: 12 }}>{msg}</p>}
</main>
);
}