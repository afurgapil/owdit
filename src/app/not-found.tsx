export default function NotFound() {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            background: "#0e0e15",
          }}
        >
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 900 }}>
              404 – Page Not Found
            </h1>
            <p style={{ fontSize: 20 }}>Sorry, we couldn’t find that page.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
