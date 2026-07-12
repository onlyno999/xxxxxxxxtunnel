import { connect } from 'cloudflare:sockets';

// 默认配置
let protocolPrefix = 'vless';
let defaultUUID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';
let proxyIP = 'proxyip.zone.id';
let proxyPort = 443;
let enableNAT64 = false;
let fakePageUrl = 'https://cf-worker-dir-bke.pages.dev';

/**
 * 获取伪装网页
 */
async function getFakePage() {
    try {
        const response = await fetch(fakePageUrl, { 'cf': { 'cacheEverything': true } });
        return new Response(response.body, response);
    } catch {
        return new Response(
            '<!DOCTYPE html><html><head><title>Welcome</title></head><body><h1>Cloudflare Worker 已部署成功</h1><p>此页面为静态伪装页面（远程加载失败）。</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}

// 验证 UUID 格式
if (!isValidUUID(defaultUUID)) throw new Error('uuid is not valid');

export default {
    async fetch(request, env, ctx) {
        try {
            // 从环境变量读取配置
            defaultUUID = env.UUID || defaultUUID;
            
            if (env.PROXYIP) {
                const parts = env.PROXYIP.split(':');
                proxyIP = parts[0];
                proxyPort = parts.length > 1 ? parseInt(parts[1], 10) : 443;
            }

            // 解析是否隐藏订阅
            let isHidden = false;
            let sarcasmMessage = '哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿';

            if (env.HIDE_SUBSCRIPTION !== undefined) {
                isHidden = env.HIDE_SUBSCRIPTION === 'true';
            } else if (env.隐藏 !== undefined) {
                isHidden = env.隐藏 === 'true';
            }

            if (env.SARCASM_MESSAGE !== undefined) {
                sarcasmMessage = env.SARCASM_MESSAGE;
            } else if (env.嘲讽语 !== undefined) {
                sarcasmMessage = env.嘲讽语;
            }

            if (env.NAT64 !== undefined) {
                enableNAT64 = env.NAT64 === 'true';
            }

            // 打印日志以便调试
            console.log('环境变量 HIDE_SUBSCRIPTION 原始值 (英文): ' + env.HIDE_SUBSCRIPTION);
            console.log('环境变量 隐藏 原始值 (中文): ' + env.隐藏);
            console.log('最终解析的布尔值 隐藏: ' + isHidden);
            console.log('环境变量 SARCASM_MESSAGE 原始值 (英文): ' + env.SARCASM_MESSAGE);
            console.log('环境变量 嘲讽语 原始值 (中文): ' + env.嘲讽语);
            console.log('最终解析的嘲讽语: ' + sarcasmMessage);
            console.log('环境变量 NAT64 原始值: ' + env.NAT64);
            console.log('最终解析的布尔值 NAT64: ' + enableNAT64);
            console.log('环境变量 PROXYIP 原始值: ' + env.PROXYIP);
            console.log('最终解析的 proxyIP: ' + proxyIP);
            console.log('最终解析的 proxyPort: ' + proxyPort);

            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                const url = new URL(request.url);
                switch (url.pathname) {
                    case '/':
                        return getFakePage();
                    case '/' + defaultUUID:
                        if (isHidden) {
                            return new Response(sarcasmMessage, { status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
                        } else {
                            const configText = generateConfig(defaultUUID, request.headers.get('Host'));
                            return new Response(configText, { status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
                        }
                    default:
                        return new Response('Not found', { status: 404 });
                }
            } else {
                return await handleWebSocketRoute(request, proxyIP, proxyPort);
            }
        } catch (err) {
            return new Response(err.toString());
        }
    }
};

/**
 * 处理 WebSocket 代理路由
 */
async function handleWebSocketRoute(request, pIP, pPort) {
    const webSocketPair = new WebSocketPair();
    const [clientWS, serverWS] = Object.values(webSocketPair);
    serverWS.accept();

    let remoteHost = '', remotePort = '';
    const log = (msg, err) => {
        console.log(`[${remoteHost}:${remotePort}] ${msg}`, err || '');
    };

    const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
    const readableStream = makeReadableStream(serverWS, earlyDataHeader, log);

    let remoteConnection = { value: null };
    let isDnsQuery = false;

    readableStream.pipeTo(new WritableStream({
        async write(chunk, controller) {
            if (isDnsQuery) {
                return await forwardDnsQuery(chunk, serverWS, null, log);
            }

            if (remoteConnection.value) {
                const writer = remoteConnection.value.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }

            // 解析 VLESS 头部
            const header = parseVlessHeader(chunk, defaultUUID);
            remoteHost = header.addressRemote;
            remotePort = header.portRemote + '--' + Math.random() + ' ' + (header.isUDP ? 'udp ' : 'tcp ');

            if (header.hasError) {
                log('Error parsing VLESS header: ' + header.message);
                safeCloseWebSocket(serverWS);
                throw new Error(header.message);
            }

            if (header.isUDP) {
                if (header.portRemote === 53) {
                    isDnsQuery = true;
                } else {
                    log('UDP proxy only enabled for DNS which is port 53');
                    safeCloseWebSocket(serverWS);
                    throw new Error('UDP proxy only enable for DNS which is port 53');
                }
            }

            const responseHeader = new Uint8Array([header.dynamicProtocolVersion[0], 0]);
            const rawData = chunk.slice(header.rawDataIndex);

            if (isDnsQuery) {
                return forwardDnsQuery(rawData, serverWS, responseHeader, log);
            }

            await establishRemoteConnection(remoteConnection, header.addressRemote, header.portRemote, rawData, serverWS, responseHeader, log, pIP, pPort, enableNAT64);
        },
        close() {
            log('readableWebSocketStream is close');
        },
        abort(err) {
            log('readableWebSocketStream is abort', JSON.stringify(err));
        }
    })).catch(err => {
        log('readableWebSocketStream pipeTo error', err);
    });

    return new Response(null, { status: 101, webSocket: clientWS });
}

/**
 * 建立到远程目标服务器的 TCP 连接（包含多重降级逻辑）
 */
async function establishRemoteConnection(connWrap, host, port, initialData, ws, respHeader, log, pIP, pPort, nat64Enabled) {
    let socket;
    try {
        log('[Attempt 1/3] Attempting direct connection to ' + host + ':' + port);
        socket = connect({ hostname: host, port: port });
        await socket.opened;
        log('[Success 1/3] Successfully connected directly to ' + host + ':' + port);
    } catch (err) {
        console.error('[Error 1/3] Direct connection failed for ' + host + ':' + port + ':', err.stack || err.message || err);
        
        if (nat64Enabled) {
            try {
                log('[Attempt 2/3] Direct failed, attempting NAT64 connection to ' + host + ':' + port);
                const { tcpSocket } = await connectWithNAT64(host, port);
                socket = tcpSocket;
                log('[Success 2/3] Successfully connected via NAT64 to ' + host + ':' + port);
            } catch (natErr) {
                console.error('[Error 2/3] NAT64 connection failed for ' + host + ':' + port + ':', natErr.stack || natErr.message || natErr);
                if (pIP) {
                    log('[Attempt 3/3] NAT64 failed, attempting to fall back to proxyIP: ' + pIP + ':' + pPort);
                    try {
                        socket = connect({ hostname: pIP, port: pPort });
                        await socket.opened;
                        log('[Success 3/3] Successfully connected via proxyIP to ' + pIP + ':' + pPort);
                    } catch (proxyErr) {
                        console.error('[Error 3/3] Fallback to proxyIP failed for ' + pIP + ':' + pPort + ':', proxyErr.stack || proxyErr.message || proxyErr);
                        safeCloseWebSocket(ws);
                        return;
                    }
                } else {
                    console.error('[Error] NAT64 failed and no fallback proxyIP provided. Closing WebSocket.');
                    safeCloseWebSocket(ws);
                    return;
                }
            }
        } else {
            log('[Skipping NAT64] NAT64 is disabled, skipping attempt.');
            if (pIP) {
                log('[Attempt 2/2] Direct failed and NAT64 disabled, attempting to fall back to proxyIP: ' + pIP + ':' + pPort);
                try {
                    socket = connect({ hostname: pIP, port: pPort });
                    await socket.opened;
                    log('[Success 2/2] Successfully connected via proxyIP to ' + pIP + ':' + pPort);
                } catch (proxyErr) {
                    console.error('[Error 2/2] Fallback to proxyIP failed for ' + pIP + ':' + pPort + ':', proxyErr.stack || proxyErr.message || proxyErr);
                    safeCloseWebSocket(ws);
                    return;
                }
            } else {
                console.error('[Error] Direct connection failed, NAT64 is disabled, and no fallback proxyIP provided. Closing WebSocket.');
                safeCloseWebSocket(ws);
                return;
            }
        }
    }

    if (socket) {
        connWrap.value = socket;
        const writer = socket.writable.getWriter();
        await writer.write(initialData);
        writer.releaseLock();
        pipeRemoteToWebSocket(socket, ws, respHeader, null, log);
    } else {
        console.error('No TCP socket established after all connection attempts. Closing WebSocket.');
        safeCloseWebSocket(ws);
    }
}

/**
 * 包装 WebSocket 接收流
 */
function makeReadableStream(ws, earlyDataHeader, log) {
    let isCanceled = false;
    return new ReadableStream({
        start(controller) {
            ws.addEventListener('message', async (event) => {
                if (isCanceled) return;
                let data = event.data;
                if (data instanceof Blob) {
                    data = await data.arrayBuffer();
                }
                controller.enqueue(data);
            });
            ws.addEventListener('close', () => {
                safeCloseWebSocket(ws);
                if (isCanceled) return;
                controller.close();
            });
            ws.addEventListener('error', (err) => {
                log('webSocketServer has error');
                controller.error(err);
            });

            const { earlyData, error } = parseEarlyData(earlyDataHeader);
            if (error) controller.error(error);
            else if (earlyData) controller.enqueue(earlyData);
        },
        pull(controller) {},
        cancel(reason) {
            if (isCanceled) return;
            log('ReadableStream was canceled, due to ' + reason);
            isCanceled = true;
            safeCloseWebSocket(ws);
        }
    });
}

/**
 * 解析 VLESS 协议数据包头部
 */
function parseVlessHeader(chunk, expectedUUID) {
    if (chunk.byteLength < 24) return { 'hasError': true, 'message': 'invalid data' };
    
    const version = new Uint8Array(chunk.slice(0, 1));
    let uuidMatched = false;
    if (stringifyUUID(new Uint8Array(chunk.slice(1, 17))) === expectedUUID) {
        uuidMatched = true;
    }
    
    if (!uuidMatched) return { 'hasError': true, 'message': 'invalid user' };

    const addonsLength = new Uint8Array(chunk.slice(17, 18))[0];
    const command = new Uint8Array(chunk.slice(18 + addonsLength, 18 + addonsLength + 1))[0];
    
    let isUDP = false;
    if (command === 1) {
        // TCP
    } else if (command === 2) {
        isUDP = true;
    } else {
        return { 'hasError': true, 'message': 'command ' + command + ' is not support, command 01-tcp,02-udp,03-mux' };
    }

    const portIndex = 19 + addonsLength;
    const portBuffer = chunk.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer).getUint16(0);

    let addressIndex = portIndex + 2;
    const addressTypeBuffer = new Uint8Array(chunk.slice(addressIndex, addressIndex + 1));
    const addressType = addressTypeBuffer[0];

    let addressLength = 0;
    let addressValueIndex = addressIndex + 1;
    let addressRemote = '';

    switch (addressType) {
        case 1: // IPv4
            addressLength = 4;
            addressRemote = new Uint8Array(chunk.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
            break;
        case 2: // 域名
            addressLength = new Uint8Array(chunk.slice(addressValueIndex, addressValueIndex + 1))[0];
            addressValueIndex += 1;
            addressRemote = new TextDecoder().decode(chunk.slice(addressValueIndex, addressValueIndex + addressLength));
            break;
        case 3: // IPv6
            addressLength = 16;
            const ipv6View = new DataView(chunk.slice(addressValueIndex, addressValueIndex + addressLength));
            const ipv6Segments = [];
            for (let i = 0; i < 8; i++) {
                ipv6Segments.push(ipv6View.getUint16(i * 2).toString(16));
            }
            addressRemote = ipv6Segments.join(':');
            break;
        default:
            return { 'hasError': true, 'message': 'invild  addressType is ' + addressType };
    }

    if (!addressRemote) {
        return { 'hasError': true, 'message': 'addressValue is empty, addressType is ' + addressType };
    }

    return {
        hasError: false,
        addressRemote,
        addressType,
        portRemote,
        rawDataIndex: addressValueIndex + addressLength,
        dynamicProtocolVersion: version,
        isUDP
    };
}

/**
 * 将远程服务器的数据管道传输回 WebSocket 客户端
 */
async function pipeRemoteToWebSocket(remoteSocket, ws, responseHeader, retryFunc, log) {
    let header = responseHeader;
    let hasIncomingData = false;

    await remoteSocket.readable.pipeTo(new WritableStream({
        start() {},
        async write(chunk, controller) {
            hasIncomingData = true;
            if (ws.readyState !== 1) { // 1 = OPEN
                controller.error('webSocket.readyState is not open, maybe close');
            }
            if (header) {
                ws.send(await new Blob([header, chunk]).arrayBuffer());
                header = null;
            } else {
                ws.send(chunk);
            }
        },
        close() {
            log('remoteConnection!.readable is close with hasIncomingData is ' + hasIncomingData);
            safeCloseWebSocket(ws);
        },
        abort(err) {
            console.error('remoteConnection!.readable abort', err);
            safeCloseWebSocket(ws);
        }
    })).catch(err => {
        console.error('remoteSocketToWS has exception ', err.stack || err);
        safeCloseWebSocket(ws);
    });
}

/**
 * 解析早期数据 (Early Data / Base64)
 */
function parseEarlyData(header) {
    if (!header) return { error: null };
    try {
        header = header.replace(/-/g, '+').replace(/_/g, '/');
        const binaryStr = atob(header);
        const bytes = Uint8Array.from(binaryStr, char => char.charCodeAt(0));
        return { earlyData: bytes.buffer, error: null };
    } catch (err) {
        return { error: err };
    }
}

// UUID 格式正则验证
function isValidUUID(uuid) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

function safeCloseWebSocket(ws) {
    try {
        if (ws.readyState === 1 || ws.readyState === 2) {
            ws.close();
        }
    } catch (err) {
        console.error('safeCloseWebSocket error', err);
    }
}

// 快速字节映射转换
const byteToHex = [];
for (let i = 0; i < 266; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
}

function convertBytesToUUID(buf, offset = 0) {
    return (
        byteToHex[buf[offset + 0]] + byteToHex[buf[offset + 1]] + byteToHex[buf[offset + 2]] + byteToHex[buf[offset + 3]] + '-' +
        byteToHex[buf[offset + 4]] + byteToHex[buf[offset + 5]] + '-' +
        byteToHex[buf[offset + 6]] + byteToHex[buf[offset + 7]] + '-' +
        byteToHex[buf[offset + 8]] + byteToHex[buf[offset + 9]] + '-' +
        byteToHex[buf[offset + 10]] + byteToHex[buf[offset + 11]] + byteToHex[buf[offset + 12]] + byteToHex[buf[offset + 13]] + byteToHex[buf[offset + 14]] + byteToHex[buf[offset + 15]]
    ).toLowerCase();
}

function stringifyUUID(buf, offset = 0) {
    const uuidStr = convertBytesToUUID(buf, offset);
    if (!isValidUUID(uuidStr)) throw TypeError('Stringified UUID is invalid');
    return uuidStr;
}

/**
 * 转发 UDP DNS 请求到公网 DNS 服务器 (8.8.8.8)
 */
async function forwardDnsQuery(udpChunk, ws, responseHeader, log) {
    try {
        const dnsServer = '8.8.8.8';
        const dnsPort = 53;
        let vlessHeader = responseHeader;

        const dnsSocket = connect({ hostname: dnsServer, port: dnsPort });
        log('dns server(' + dnsServer + ':53');

        const writer = dnsSocket.writable.getWriter();
        await writer.write(udpChunk);
        writer.releaseLock();

        await dnsSocket.readable.pipeTo(new WritableStream({
            async write(chunk) {
                if (ws.readyState === 1) { // OPEN
                    if (vlessHeader) {
                        ws.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
                        vlessHeader = null;
                    } else {
                        ws.send(chunk);
                    }
                }
            },
            close() {
                log('dns server(' + dnsServer + ') tcp is close');
            },
            abort(err) {
                console.error('dns server(' + dnsServer + ') tcp is abort', err);
            }
        }));
    } catch (err) {
        console.error('handleDNSQuery have exception, error: ' + err.message);
    }
}

/**
 * 生成配置订阅文件内容 (Clash / V2Ray)
 */
function generateConfig(uuid, host) {
    const fullProtocol = protocolPrefix + '://';
    const uri = fullProtocol + uuid + '@' + host + ':443?encryption=none&security=tls&sni=' + host + '&fp=randomized&type=ws&host=' + host + '&path=%2F%3Fed%3D2048#' + host;
    
    return (
        '################################################################\n' +
        'v2ray\n' +
        '---------------------------------------------------------------\n' +
        uri + '\n' +
        '################################################################\n' +
        'clash-meta\n' +
        '---------------------------------------------------------------\n' +
        '- type: ' + protocolPrefix + '\n' +
        '  name: ' + host + '\n' +
        '  server: ' + host + '\n' +
        '  port: 443\n' +
        '  uuid: ' + uuid + '\n' +
        '  network: ws\n' +
        '  tls: true\n' +
        '  udp: false\n' +
        '  sni: ' + host + '\n' +
        '  client-fingerprint: chrome\n' +
        '  ws-opts:\n' +
        '    path: "/?ed=2048"\n' +
        '    headers:\n' +
        '      host: ' + host + '\n' +
        '---------------------------------------------------------------\n' +
        '################################################################'
    );
}

/**
 * 将 IPv4 映射转换为 NAT64 IPv6 地址
 */
function convertToNAT64Address(ipv4Str) {
    const segments = ipv4Str.split('.');
    if (segments.length !== 4) throw new Error('Invalid IPv4 address format for NAT64 conversion.');
    
    const hexSegments = segments.map(seg => {
        const val = parseInt(seg, 10);
        if (val < 0 || val > 255) throw new Error('Invalid IPv4 address segment for NAT64 conversion.');
        return val.toString(16).padStart(2, '0');
    });
    
    return '2602:fc59:b0:64::' + hexSegments[0] + hexSegments[1] + ':' + hexSegments[2] + hexSegments[3];
}

/**
 * 借用 DoH (DNS over HTTPS) 解析并将其转换为 NAT64
 */
async function resolveNAT64(domain) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);
    
    try {
        const response = await fetch('https://1.1.1.1/dns-query?name=' + domain + '&type=A', {
            headers: { 'Accept': 'application/dns-json' },
            signal: abortController.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('DNS query failed with status: ' + response.status);
        const json = await response.json();

        if (json.Answer && json.Answer.length > 0) {
            const aRecord = json.Answer.find(rec => rec.type === 1); // 1 = A Record
            if (aRecord) {
                return convertToNAT64Address(aRecord.data);
            }
        }
        throw new Error('No A record found for domain or unable to resolve IPv4 address.');
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('DNS resolution for NAT64 timed out for domain: ' + domain);
        throw new Error('DNS resolution for NAT64 failed: ' + err.message);
    }
}

/**
 * 通过 NAT64 建立连接
 */
async function connectWithNAT64(host, port) {
    let targetIp;
    const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    if (isIPv4.test(host)) {
        targetIp = convertToNAT64Address(host);
    } else {
        targetIp = await resolveNAT64(host);
    }

    const socket = connect({ hostname: '[' + targetIp + ']', port: port });
    await socket.opened;
    return { tcpSocket: socket };
}
