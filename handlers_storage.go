package main

import (
	"fmt"
	"net/http"
	"strconv"
)

func handleListStorage(w http.ResponseWriter, r *http.Request) {
	msg, ok := cmdListStorageContainers().(msgStorageContainers)
	if !ok {
		jsonErr(w, fmt.Errorf("internal error"), 500)
		return
	}
	if msg.err != nil {
		jsonErr(w, msg.err, 500)
		return
	}
	rows := msg.rows
	if rows == nil {
		rows = []storageContainerRow{}
	}
	jsonOK(w, rows)
}

func handleGetStorageItems(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, fmt.Errorf("invalid id"), 400)
		return
	}
	msg, ok := cmdGetContainerInventory(id)().(msgContainerInventory)
	if !ok {
		jsonErr(w, fmt.Errorf("internal error"), 500)
		return
	}
	if msg.err != nil {
		jsonErr(w, msg.err, 500)
		return
	}
	rows := msg.rows
	if rows == nil {
		rows = []itemInfo{}
	}
	jsonOK(w, rows)
}

func handleGiveItemToStorage(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, fmt.Errorf("invalid id"), 400)
		return
	}
	var req struct {
		Template string `json:"template"`
		Qty      int64  `json:"qty"`
		Quality  int64  `json:"quality"`
	}
	if err := decode(r, &req); err != nil {
		jsonErr(w, err, 400)
		return
	}
	msg, ok := cmdGiveItemToContainer(id, req.Template, req.Qty, req.Quality)().(msgMutate)
	if !ok {
		jsonErr(w, fmt.Errorf("internal error"), 500)
		return
	}
	if msg.err != nil {
		jsonErr(w, msg.err, 500)
		return
	}
	jsonOK(w, map[string]string{"ok": msg.ok})
}

func handleGiveItemsToStorage(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, fmt.Errorf("invalid id"), 400)
		return
	}
	var req struct {
		Items []struct {
			Template string `json:"template"`
			Qty      int64  `json:"qty"`
			Quality  int64  `json:"quality"`
		} `json:"items"`
	}
	if err := decode(r, &req); err != nil {
		jsonErr(w, err, 400)
		return
	}
	type skippedItem struct {
		Template string `json:"template"`
		Reason   string `json:"reason"`
	}
	given := []string{}
	skipped := []skippedItem{}
	for _, item := range req.Items {
		msg, ok := cmdGiveItemToContainer(id, item.Template, item.Qty, item.Quality)().(msgMutate)
		if !ok || msg.err != nil {
			reason := "internal error"
			if ok && msg.err != nil {
				reason = msg.err.Error()
			}
			skipped = append(skipped, skippedItem{Template: item.Template, Reason: reason})
			continue
		}
		given = append(given, item.Template)
	}
	jsonOK(w, map[string]any{"given": given, "skipped": skipped})
}
