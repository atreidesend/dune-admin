package main

import "testing"

func TestIsReadOnlySQL(t *testing.T) {
	tests := []struct {
		name string
		sql  string
		want bool
	}{
		{"select uppercase", "SELECT * FROM players", true},
		{"select lowercase", "select id from players", true},
		{"select leading whitespace", "  SELECT 1", true},
		{"explain allowed", "EXPLAIN SELECT * FROM players", true},
		{"show allowed", "SHOW TABLES", true},
		{"update blocked", "UPDATE players SET x=1", false},
		{"delete blocked", "DELETE FROM players", false},
		{"insert blocked", "INSERT INTO players VALUES (1)", false},
		{"drop blocked", "DROP TABLE players", false},
		{"truncate blocked", "TRUNCATE players", false},
		{"line comment stripped, select kept", "-- comment\nSELECT 1", true},
		{"block comment stripped, select kept", "/* comment */ SELECT 1", true},
		{"block comment disguises write", "/* SELECT */ UPDATE players SET x=1", false},
		{"multiline block comment", "/*\n multi\n line\n*/SELECT 1", true},
		{"select no word boundary blocked", "selectinto players", false},
		{"cte select allowed", "WITH cte AS (SELECT 1) SELECT * FROM cte", true},
		{"empty string", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isReadOnlySQL(tt.sql); got != tt.want {
				t.Errorf("isReadOnlySQL(%q) = %v, want %v", tt.sql, got, tt.want)
			}
		})
	}
}

func TestIsValidK8sName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"valid simple", "my-pod", true},
		{"valid with numbers", "pod-123", true},
		{"valid with dots", "my.pod.name", true},
		{"single char", "a", true},
		{"two chars", "ab", true},
		{"empty", "", false},
		{"starts with dash", "-bad-name", false},
		{"ends with dash", "bad-name-", false},
		{"uppercase blocked", "MyPod", false},
		{"space blocked", "my pod", false},
		{"semicolon injection", "pod; rm -rf /", false},
		{"backtick injection", "pod`whoami`", false},
		{"dollar injection", "pod$(id)", false},
		{"pipe injection", "pod|cat /etc/passwd", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidK8sName(tt.input); got != tt.want {
				t.Errorf("isValidK8sName(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}
