"use strict";

function createNativeAdminClient({ ipcRenderer, getBinaryPath, getClashPath, getFilesPath, whenReady = () => Promise.resolve() }) {
    const invoke = (scope, action, extra = {}) => whenReady().then(() => {
        const clashPath = getClashPath();  
        const filesPath = getFilesPath();  
        if (typeof clashPath !== "string" || clashPath === "") {  
            throw new Error("CFW data directory is not initialized yet");  
        }  
        if (typeof filesPath !== "string" || filesPath === "") {  
            throw new Error("Packaged files path is not initialized yet");  
        }
        return ipcRenderer.invoke("native-admin", scope, action, {
        ...extra,
        clashPath: getClashPath(),
        filesPath: getFilesPath()
        });
    });

    return {
        firewall: {
            status: () => invoke("firewall", "status", { binaryPath: getBinaryPath() }),
            add: () => invoke("firewall", "add", { binaryPath: getBinaryPath() }),
            remove: () => invoke("firewall", "remove", { binaryPath: getBinaryPath() })
        },
        systemProxy: {
            set: ({ enabled, mixedPort, innerServerPort }) => invoke("system-proxy", "set", { enabled, mixedPort, innerServerPort }),
            getStatus: () => invoke("system-proxy", "status")
        },
        dns: {
            query: () => invoke("dns", "query"),
            reset: () => invoke("dns", "reset"),
            set: addresses => invoke("dns", "set", { addresses })
        },
        profileNetworkEffects: {
            hasTap: () => invoke("profile-network", "has-tap"),
            renewDhcp: () => invoke("profile-network", "renew-dhcp")
        },
        terminal: {
            open: (selection, elevated, port) => invoke("terminal", "open", { selection, elevated, port }),
            loopback: () => invoke("terminal", "loopback")
        },
        tun: {
            setup: (install, tapInfo) => invoke("tun", "setup", { install, tapInfo }),
            start: (mixedPort, tapInfo, requestId, allowMulticast = false) => invoke("tun", "start", { mixedPort, tapInfo, requestId, allowMulticast }),
            cancel: requestId => invoke("tun", "cancel", { requestId }),
            stop: () => invoke("tun", "stop")
        },
        service: {
            status: () => invoke("service", "status"),
            needUpdate: () => invoke("service", "need-update"),
            install: (method, options) => invoke("service", "install", { method, skipMihomoVerification: !!(options && options.skipMihomoVerification), useSystemMihomo: !!(options && options.useSystemMihomo)}),
            uninstall: () => invoke("service", "uninstall"),
            update: (options) => invoke("service", "update", { skipMihomoVerification: !!(options && options.skipMihomoVerification), useSystemMihomo: !!(options && options.useSystemMihomo) })
        }
    };
}

module.exports = { createNativeAdminClient };
