package config

import "os"

type Config struct {
	Port         string
	DatabasePath string
	DataDir      string
	AIServiceURL string
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DatabasePath: getEnv("DATABASE_PATH", "./data/codewiki.db"),
		DataDir:      getEnv("DATA_DIR", "./data"),
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
