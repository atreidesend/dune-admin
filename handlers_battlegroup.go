package main

import (
	"fmt"
	"net/http"
	"strings"
)

var bgCmdAllowlist = map[string]bool{
	"start": true, "stop": true, "restart": true,
	"update": true, "backup": true, "restore": true,
}

func handleBGStatus(w http.ResponseWriter, r *http.Request) {
	out, err := sshExec(fmt.Sprintf("sudo kubectl get pods -n %s -o wide 2>&1", globalPodNS))
	if err != nil {
		jsonErr(w, fmt.Errorf("kubectl: %w — output: %s", err, out), 500)
		return
	}
	jsonOK(w, map[string]string{"output": out})
}

func handleBGExec(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Cmd string `json:"cmd"`
	}
	if err := decode(r, &req); err != nil {
		jsonErr(w, err, 400)
		return
	}
	if !bgCmdAllowlist[req.Cmd] {
		jsonErr(w, fmt.Errorf("unknown command %q", req.Cmd), 400)
		return
	}
	out, err := sshExec(fmt.Sprintf("sudo ~/.dune/download/scripts/battlegroup.sh %s 2>&1", req.Cmd))
	if err != nil {
		jsonErr(w, fmt.Errorf("exec: %w — output: %s", err, out), 500)
		return
	}
	jsonOK(w, map[string]string{"output": out})
}

func handleBGPods(w http.ResponseWriter, r *http.Request) {
	out, err := sshExec(fmt.Sprintf("sudo kubectl get pods -n %s --no-headers 2>&1", globalPodNS))
	if err != nil {
		jsonErr(w, fmt.Errorf("kubectl: %w", err), 500)
		return
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	jsonOK(w, map[string]any{"pods": lines, "namespace": globalPodNS})
}
