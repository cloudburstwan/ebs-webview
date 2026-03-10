package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type StreamEntry struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Status        int    `json:"status"`
	WitholdStatus int    `json:"witholdStatus"`
	Viewers       int    `json:"viewers,omitempty"`
}

func main() {
	// Configuration
	defaultPort := "9000"
	if envPort := os.Getenv("PORT"); envPort != "" {
		defaultPort = envPort
	}

	port := flag.String("port", defaultPort, "Port to bind the server to")
	hlsPath := flag.String("hls-path", getEnv("HLS_PATH", "/s/"), "URL path for HLS streams")
	hlsDir := flag.String("hls-dir", getEnv("HLS_DIR", "./hls"), "Local directory to serve HLS files from")
	flag.Parse()

	addr := fmt.Sprintf(":%s", *port)

	// Ensure hlsPath starts and ends with /
	cleanPath := *hlsPath
	if cleanPath[0] != '/' {
		cleanPath = "/" + cleanPath
	}
	if cleanPath[len(cleanPath)-1] != '/' {
		cleanPath = cleanPath + "/"
	}

	// Ensure hls directory exists
	if _, err := os.Stat(*hlsDir); os.IsNotExist(err) {
		if err := os.MkdirAll(*hlsDir, 0755); err != nil {
			log.Printf("[MockAPI] Warning: Could not create hls directory %s: %v\n", *hlsDir, err)
		}
	}

	// Stream list handler
	http.HandleFunc("/api/v1/streams", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[MockAPI] %s %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		streams := []StreamEntry{
			{ID: "st-01", Name: "Pony_Main", Status: 2, WitholdStatus: 0, Viewers: 1250},
			{ID: "st-02", Name: "Pony_Music", Status: 2, WitholdStatus: 0, Viewers: 450},
			{ID: "st-03", Name: "Legal_Hold", Status: 0, WitholdStatus: 1},
			{ID: "st-04", Name: "Policy_Issue", Status: 0, WitholdStatus: 2},
			{ID: "st-05", Name: "Technical_Issues", Status: 0, WitholdStatus: 3},
			{ID: "st-06", Name: "Starting_Soon", Status: 1, WitholdStatus: 0},
			{ID: "st-07", Name: "Quiet_Stream", Status: 2, WitholdStatus: 0, Viewers: 12},
			{ID: "st-08", Name: "Classic_Hits", Status: 2, WitholdStatus: 0, Viewers: 890},
			{ID: "st-09", Name: "Banned_Stream", Status: 0, WitholdStatus: 2},
			{ID: "st-10", Name: "Test_Feed", Status: 1, WitholdStatus: 0},
			{ID: "st-11", Name: "Local_Test", Status: 2, WitholdStatus: 0, Viewers: 5},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(streams); err != nil {
			log.Printf("[MockAPI] Error encoding response: %v\n", err)
			return
		}
		log.Printf("[MockAPI] Successfully served %d streams\n", len(streams))
	})

	// HLS static file server with fallback logic
	hlsFileServer := http.StripPrefix(cleanPath, http.FileServer(http.Dir(*hlsDir)))
	http.HandleFunc(cleanPath, func(w http.ResponseWriter, r *http.Request) {
		// Log specific file access (optional, can be noisy for segments)
		if r.URL.Path != "" && r.URL.Path != "/" {
			log.Printf("[MockAPI] HLS Request: %s\n", r.URL.Path)
		}

		// CORS for HLS (needs Range etc)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Range, Accept-Encoding")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length,Content-Range")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Fallback Logic
		requestedFile := strings.TrimPrefix(r.URL.Path, cleanPath)
		if requestedFile != "" {
			fullPath := filepath.Join(*hlsDir, requestedFile)
			// Check if the specific file exists
			if _, err := os.Stat(fullPath); os.IsNotExist(err) {
				// 1. If it's a playlist, prioritize default.m3u8 in the root
				if strings.HasSuffix(requestedFile, ".m3u8") {
					fallbackM3u8 := filepath.Join(*hlsDir, "default.m3u8")
					if _, err := os.Stat(fallbackM3u8); err == nil {
						log.Printf("[MockAPI] Fallback: Serving default.m3u8 for missing playlist %s\n", requestedFile)
						r.URL.Path = cleanPath + "default.m3u8"
						hlsFileServer.ServeHTTP(w, r)
						return
					}
				}

				// 2. Try to find the file in the 'default' subfolder (useful for segments or specific overrides)
				defaultPath := filepath.Join(*hlsDir, "default", requestedFile)
				if _, err := os.Stat(defaultPath); err == nil {
					log.Printf("[MockAPI] Fallback: Serving %s from default/ folder\n", requestedFile)
					r.URL.Path = cleanPath + "default/" + requestedFile
				}
			}
		}

		hlsFileServer.ServeHTTP(w, r)
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[MockAPI] WARNING: Undefined endpoint called: %s %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
		http.Error(w, "Endpoint not found", http.StatusNotFound)
	})

	log.Printf("Mock API server starting on %s...\n", addr)
	log.Printf("HLS files served from %s at %s\n", *hlsDir, cleanPath)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
