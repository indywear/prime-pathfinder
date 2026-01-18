"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminRichMenuPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [richMenuId, setRichMenuId] = useState("");
    const [richMenus, setRichMenus] = useState<any[]>([]);

    const createRichMenu = async () => {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch("/api/richmenu", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setRichMenuId(data.richMenuId);
                setMessage(`Rich Menu created: ${data.richMenuId}`);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const getRichMenus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/richmenu");
            const data = await res.json();
            setRichMenus(data.richmenus || data || []);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const uploadImage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!richMenuId) {
            setMessage("Please enter Rich Menu ID");
            return;
        }
        
        const formData = new FormData(e.currentTarget);
        setLoading(true);
        setMessage("");
        
        try {
            const res = await fetch(`/api/richmenu/image?richMenuId=${richMenuId}`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setMessage(data.success ? "Image uploaded!" : `Error: ${data.error}`);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const setDefault = async () => {
        if (!richMenuId) {
            setMessage("Please enter Rich Menu ID");
            return;
        }
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`/api/richmenu/default?richMenuId=${richMenuId}`, {
                method: "POST",
            });
            const data = await res.json();
            setMessage(data.success ? "Set as default!" : `Error: ${data.error}`);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const deleteRichMenu = async (id: string) => {
        setLoading(true);
        try {
            await fetch(`/api/richmenu?richMenuId=${id}`, { method: "DELETE" });
            setMessage(`Deleted: ${id}`);
            getRichMenus();
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    return (
        <main style={{ minHeight: "100vh", background: "#F8FAF9" }}>
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-brand">ProficienThAI</Link>
                    <div className="nav-links">
                        <Link href="/admin/richmenu" className="nav-link active">Rich Menu</Link>
                    </div>
                </div>
            </nav>

            <div className="container" style={{ padding: "32px 20px", maxWidth: "800px" }}>
                <h1 style={{ marginBottom: "32px" }}>Rich Menu Management</h1>

                {message && (
                    <div style={{
                        padding: "12px 16px",
                        background: message.includes("Error") ? "#FFEBEE" : "#E8F5E9",
                        color: message.includes("Error") ? "#C62828" : "#2E7D32",
                        borderRadius: "8px",
                        marginBottom: "24px",
                    }}>
                        {message}
                    </div>
                )}

                <div className="card" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px" }}>1. Create Rich Menu</h3>
                    <button
                        onClick={createRichMenu}
                        disabled={loading}
                        style={{
                            padding: "12px 24px",
                            background: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? "Creating..." : "Create Rich Menu"}
                    </button>
                </div>

                <div className="card" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px" }}>2. Upload Image</h3>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                            Rich Menu ID:
                        </label>
                        <input
                            type="text"
                            value={richMenuId}
                            onChange={(e) => setRichMenuId(e.target.value)}
                            placeholder="richmenu-xxxxxx"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #DDD",
                                borderRadius: "8px",
                                fontSize: "14px",
                            }}
                        />
                    </div>
                    <form onSubmit={uploadImage}>
                        <input
                            type="file"
                            name="image"
                            accept="image/png,image/jpeg"
                            required
                            style={{ marginBottom: "12px" }}
                        />
                        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "12px" }}>
                            Image size: 2500x1686 pixels, PNG or JPEG, max 1MB
                        </p>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: "12px 24px",
                                background: "#2196F3",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            Upload Image
                        </button>
                    </form>
                </div>

                <div className="card" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px" }}>3. Set as Default</h3>
                    <button
                        onClick={setDefault}
                        disabled={loading || !richMenuId}
                        style={{
                            padding: "12px 24px",
                            background: "#FF9800",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: loading || !richMenuId ? "not-allowed" : "pointer",
                            opacity: loading || !richMenuId ? 0.7 : 1,
                        }}
                    >
                        Set as Default Menu
                    </button>
                </div>

                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3>Existing Rich Menus</h3>
                        <button
                            onClick={getRichMenus}
                            disabled={loading}
                            style={{
                                padding: "8px 16px",
                                background: "#666",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                    {richMenus.length === 0 ? (
                        <p style={{ color: "#666" }}>Click Refresh to load rich menus</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {richMenus.map((menu: any) => (
                                <div
                                    key={menu.richMenuId}
                                    style={{
                                        padding: "12px",
                                        background: "#F5F5F5",
                                        borderRadius: "8px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: "500" }}>{menu.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "#666" }}>
                                            {menu.richMenuId}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={() => setRichMenuId(menu.richMenuId)}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#4CAF50",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "0.75rem",
                                            }}
                                        >
                                            Use
                                        </button>
                                        <button
                                            onClick={() => deleteRichMenu(menu.richMenuId)}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#F44336",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "0.75rem",
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
