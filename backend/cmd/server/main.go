package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/user/ai-codewiki-backend/internal/config"
	"github.com/user/ai-codewiki-backend/internal/db"
	"github.com/user/ai-codewiki-backend/internal/handler"
)

func main() {
	cfg := config.Load()

	database, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	r := chi.NewRouter()

	// Middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200", "http://localhost:*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		h := handler.New(database, cfg)

		// File tree
		r.Get("/tree", h.GetTree)

		// File summary
		r.Post("/summary", h.GetSummary)

		// Search
		r.Get("/search", h.SearchFiles)

		// Settings
		r.Get("/settings", h.GetSettings)
		r.Put("/settings", h.UpdateSettings)

		// Bookmarks
		r.Get("/bookmarks", h.ListBookmarks)
		r.Post("/bookmarks", h.AddBookmark)
		r.Delete("/bookmarks/{id}", h.RemoveBookmark)

		// History
		r.Get("/history", h.ListHistory)

		// LLM
		r.Post("/llm/validate", h.ValidateLLMKey)

		// Browse directories
		r.Get("/browse", h.BrowseDirs)
		r.Get("/browse/roots", h.GetRoots)

		// Dependencies
		r.Post("/deps", h.GetDeps)

		// Indexing
		r.Post("/index", h.IndexProject)

		// AI Features
		r.Post("/qa", h.CodeQA)
		r.Post("/impact-analysis", h.AnalyzeImpact)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 AI-CodeWiki Backend starting on %s", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		fmt.Fprintf(os.Stderr, "Server failed: %v\n", err)
		os.Exit(1)
	}
}
