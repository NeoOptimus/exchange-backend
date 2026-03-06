"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import Link from "next/link";

export default function DashboardPage() {
const router = useRouter();
const [me, setMe] = useState<any>(null);
const [err, setErr] = useState("");

useEffect(() => {
const token = getToken();
if (!token) {
router.push("/");
return;
}

API.get("/me")
.then((r) => setMe(r.data))
.catch(() => setErr("Сессия недействительна"));
}, [router]);

const logout = () => {
clearToken();
router.push("/");
};

return (
<main style={{ maxWidth: 720, margin: "30px auto", fontFamily: "sans-serif" }}>
<h1>Личный кабинет</h1>
<nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
<Link href="/dashboard">Dashboard</Link>
<Link href="/wallets">Wallets</Link>
<Link href="/orders">Orders</Link>
</nav>

<button onClick={logout}>Выйти</button>

{err && <p>{err}</p>}
{me && (
<pre style={{ background: "#f5f5f5", padding: 12, marginTop: 12 }}>
{JSON.stringify(me, null, 2)}
</pre>
)}
</main>
);
}