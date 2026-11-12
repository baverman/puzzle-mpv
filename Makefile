EXTENSION_DIR := firefox-extension
EXTENSION_FILES := manifest.json content.js content.css
VERSION := $(shell python3 -c 'import json; print(json.load(open("$(EXTENSION_DIR)/manifest.json"))["version"])')
XPI := puzzle-movies-exporter-$(VERSION).xpi

.PHONY: all xpi clean

all: xpi

xpi: $(XPI)

$(XPI): $(addprefix $(EXTENSION_DIR)/,$(EXTENSION_FILES))
	rm -f $@
	cd $(EXTENSION_DIR) && zip -9 ../$@ $(EXTENSION_FILES)

clean:
	rm -f $(XPI)
