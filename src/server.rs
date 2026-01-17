use axum::Router;
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

pub async fn run_server(db_name: String, port: u16) {
    // Create API router
    let app = crate::api::create_router(db_name);
    
    // Add CORS middleware for local development
    let app = app.layer(
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    );
    
    // Bind to address
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("🚀 API Server running on http://{}", addr);
    println!("📊 Executive Dashboard: http://{}//api/dashboard/executive", addr);
    
    // Run server
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
