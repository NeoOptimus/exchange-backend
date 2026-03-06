"use client";

import Link from "next/link";

export default function OrdersPage() {
return (
<main style={{ maxWidth: 720, margin: "30px auto", fontFamily: "sans-serif" }}>
<h1>Orders</h1>
<nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
<Link href="/dashboard">Dashboard</Link>
<Link href="/wallets">Wallets</Link>
<Link href="/orders">Orders</Link>
</nav>

<p>Следующий шаг: подключаем список сделок из API.</p>
</main>
);
}