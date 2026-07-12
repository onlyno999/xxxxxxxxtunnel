import { connect as 连接 } from 'cloudflare:sockets';
// 兼容日期 2026.1.20
/*
vless://9999ad27-33db-4705-b026-a4cefa6b9999@162.159.39.178:443?encryption=none&security=tls&sni=你部署的host&fp=chrome&alpn=h3&insecure=0&allowInsecure=0&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F223.6.6.6%2Fdns-query&type=ws&host=你部署的host&path=%2F#cf
*/

const 基础64文本解码器 = new TextDecoder();
function 解码64(文本) {
  const 二进制 = atob(文本);
  const 字节 = new Uint8Array(二进制.length);
  for (let 索引 = 0; 索引 < 二进制.length; 索引++) 字节[索引] = 二进制.charCodeAt(索引);
  return 基础64文本解码器.decode(字节);
}

const 错误_无效数据 = 解码64('aW52YWxpZCBkYXRh');
const 错误_无效用户 = 解码64('aW52YWxpZCB1c2Vy');
const 错误_不支持命令 = 解码64('Y29tbWFuZCBpcyBub3Qgc3VwcG9ydGVk');
const 错误_仅支持DNS_UDP = 解码64('VURQIHByb3h5IG9ubHkgZW5hYmxlIGZvciBETlMgd2hpY2ggaXMgcG9ydCA1Mw==');
const 错误_无效地址类型 = 解码64('aW52YWxpZCBhZGRyZXNzVHlwZQ==');
const 错误_空地址 = 解码64('YWRkcmVzc1ZhbHVlIGlzIGVtcHR5');
const 错误_无效标识字符串 = 解码64('U3RyaW5naWZpZWQgaWRlbnRpZmllciBpcyBpbnZhbGlk');
const 日志_流关闭 = 解码64('c3RyZWFtIGNsb3NlZA==');
const 日志_流中止 = 解码64('c3RyZWFtIGFib3J0');
const 日志_管道错误 = 解码64('c3RyZWF0IHBpcGUgZXJyb3I=');
const 日志_连接成功 = 解码64('Y29ubmVjdGVk');
const 日志_重试错误 = 解码64('cmV0cnkgZXJy');
const 日志_关闭错误 = 解码64('Y2xvc2UgZXJy');
const 日志_远程关闭 = 解码64('cmVtb3RlIGNsb3NlLCBkYXRhOg==');
const 日志_远程中止 = 解码64('cmVtb3RlIGFib3J0');
const 日志_传输错误 = 解码64('dHJhbnNmZXIgZXJyb3I=');
const 日志_DNS错误 = 解码64('ZG5zIGVycjo=');
const 日志_DNS成功 = 解码64('ZG5zIHJlc29sdmUgc3VjY2Vzczo=');
const 日志_套接字错误 = 解码64('c29ja2V0IGVycg==');
const 日志_流取消 = 解码64('c3RyZWF0IGNhbmNlbDo=');
const 日志_套接字关闭 = 解码64('c29ja2V0IGNsb3NlZA==');
const 响应_未找到 = 解码64('Tm90IGZvdW5k');
const 内容类型_纯文本 = 解码64('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04');
const 升级头名称 = 解码64('VXBncmFkZQ==');
const 协议_WebSocket = 解码64('d2Vic29ja2V0');
const 协议_早期数据 = 解码64('c2VjLXdlYnNvY2tldC1wcm90b2NvbA==');
const 内容类型头 = 解码64('Y29udGVudC10eXBl');
const MIME_DNS = 解码64('YXBwbGljYXRpb24vZG5zLW1lc3NhZ2U=');
const DNS服务器URL = 解码64('aHR0cHM6Ly84LjguOC44L2Rucy1xdWVyeQ==');
const HTTP方法_POST = 解码64('UE9TVA==');
const 日志_UDP标签 = 解码64('dWRwIA==');
const 日志_TCP标签 = 解码64('dGNwIA==');
const 日志_关闭消息 = 解码64('c29ja2V0IGNsb3NlZA==');


let 认证令牌 = '9999ad27-33db-4705-b026-a4cefa6b9999';
let 代理IP = 'Prox'+'yIP.CM'+'Liusss'+'s.net';

if (!验证UUID(认证令牌)) throw new Error(错误_无效标识字符串);

export default {
    async fetch(请求, 环境, 上下文) {
        try {
            认证令牌 = 环境.UUID || 认证令牌;
            代理IP = 环境.PROXYIP || 代理IP;
            const 升级头 = 请求.headers.get(升级头名称);
            if (!升级头 || 升级头 !== 协议_WebSocket) {
                const 网址 = new URL(请求.url);
                switch (网址.pathname) {
                    case '/':
                        return fetch('https://global.cctv.com/');
                    default:
                        return new Response(响应_未找到, { status: 404 });
                }
            } else return await 处理WebSocket(请求);
        } catch (错误) {
            return new Response(错误.toString());
        }
    },
};

async function 处理WebSocket(请求) {
    const 套接字对 = new WebSocketPair();
    const [客户端, 服务端] = Object.values(套接字对);
    服务端.accept();

    let 目标地址 = '', 目标端口 = '';
    const 记录日志 = (信息, 错误) => console.log(`[${目标地址}:${目标端口}] ${信息}`, 错误 || '');
    const 早期数据协议 = 请求.headers.get(协议_早期数据) || '';
    const 可读流 = 创建可读流(服务端, 早期数据协议, 记录日志);

    let 连接结果 = { value: null };
    let UDP写入器 = null, 已发送UDP头 = false;

    可读流.pipeTo(new WritableStream({
        async write(数据块, 控制器) {
            if (已发送UDP头 && UDP写入器) return UDP写入器(数据块);
            if (连接结果.value) {
                const 写入器 = 连接结果.value.writable.getWriter();
                await 写入器.write(数据块);
                写入器.releaseLock();
                return;
            }

            const {
                hasError: 有错误,
                message: 消息,
                portRemote: 远程端口 = 443,
                addressRemote: 远程地址,
                rawDataIndex: 原始数据索引,
                wVersion: w版本 = new Uint8Array([0, 0]),
                isUDP: 是否UDP
            } = 解析w数据(数据块, 认证令牌);

            目标地址 = 远程地址;
            目标端口 = `${远程端口}--${Math.random()} ${是否UDP ? 日志_UDP标签 : 日志_TCP标签}`;
            if (有错误) throw new Error(消息);
            if (是否UDP && 远程端口 !== 53) throw new Error(错误_仅支持DNS_UDP);

            const 版本头 = new Uint8Array([w版本[0], 0]);
            const 剩余数据 = 数据块.slice(原始数据索引);

            if (是否UDP) {
                const { write } = await 处理UDP(服务端, 版本头, 记录日志);
                UDP写入器 = write;
                已发送UDP头 = true;
                UDP写入器(剩余数据);
                return;
            }
            连接并转发(连接结果, 远程地址, 远程端口, 剩余数据, 服务端, 版本头, 记录日志);
        },
        close() { 记录日志(日志_流关闭) },
        abort(原因) { 记录日志(日志_流中止, JSON.stringify(原因)) }
    })).catch(错误 => 记录日志(日志_管道错误, 错误));

    return new Response(null, { status: 101, webSocket: 客户端 });
}

async function 连接并转发(连接结果, 地址, 端口, 初始数据, 服务端, 版本头, 记录日志) {
    async function 建立连接(目标地址, 目标端口) {
        const 套接字 = 连接({ hostname: 目标地址, port: 目标端口 });
        连接结果.value = 套接字;
        记录日志(`${日志_连接成功} ${目标地址}:${目标端口}`);
        const 写入器 = 套接字.writable.getWriter();
        await 写入器.write(初始数据);
        写入器.releaseLock();
        return 套接字;
    }

    async function 重试连接() {
        const 套接字 = await 建立连接(代理IP || 地址, 端口);
        套接字.closed.catch(错误 => console.log(日志_重试错误, 错误)).finally(() => 关闭WebSocket(服务端));
        转发数据(套接字, 服务端, 版本头, 重试连接, 记录日志);
    }

    const 套接字 = await 建立连接(地址, 端口);
    转发数据(套接字, 服务端, 版本头, 重试连接, 记录日志);
}

function 创建可读流(服务端, 早期数据, 记录日志) {
    let 已取消 = false;
    return new ReadableStream({
        start(控制器) {
            服务端.addEventListener('message', 事件 => {
                if (已取消) return;
                控制器.enqueue(事件.data);
            });
            服务端.addEventListener('close', () => {
                关闭WebSocket(服务端);
                if (已取消) return;
                控制器.close();
            });
            服务端.addEventListener('error', 事件 => {
                记录日志(日志_套接字错误);
                控制器.error(事件);
            });
            const { earlyData: 早期数据字节, error: 错误 } = 解码早期数据(早期数据);
            错误 ? 控制器.error(错误) : 早期数据字节 && 控制器.enqueue(早期数据字节.buffer);
        },
        pull() {},
        cancel(原因) {
            if (已取消) return;
            记录日志(`${日志_流取消} ${原因}`);
            已取消 = true;
            关闭WebSocket(服务端);
        }
    });
}

function 解析w数据(数据块, 用户密钥) {
    if (数据块.byteLength < 24) return { hasError: true, message: 错误_无效数据 };
    const 版本 = new Uint8Array(数据块.slice(0, 1));
    let 是否UDP = false, 是否UDP命令 = false;
    const 用户ID字节 = new Uint8Array(数据块.slice(1, 17));
    if (验证并获取UUID(用户ID字节) !== 用户密钥) return { hasError: true, message: 错误_无效用户 };

    const 可选长度 = new Uint8Array(数据块.slice(17, 18))[0];
    const 命令 = new Uint8Array(数据块.slice(18 + 可选长度, 19 + 可选长度))[0];
    if (命令 === 2) 是否UDP命令 = true;
    else if (命令 !== 1) return { hasError: true, message: 错误_不支持命令 };

    const 端口起始 = 18 + 可选长度 + 1;
    const 端口字节 = 数据块.slice(端口起始, 端口起始 + 2);
    const 远程端口 = new DataView(端口字节).getUint16(0);

    const 地址起始 = 端口起始 + 2;
    const 地址类型 = new Uint8Array(数据块.slice(地址起始, 地址起始 + 1))[0];
    let 地址长度 = 0, 地址值起始 = 地址起始 + 1, 远程地址 = '';

    switch (地址类型) {
        case 1:
            地址长度 = 4;
            远程地址 = new Uint8Array(数据块.slice(地址值起始, 地址值起始 + 地址长度)).join('.');
            break;
        case 2:
            地址长度 = new Uint8Array(数据块.slice(地址值起始, 地址值起始 + 1))[0];
            地址值起始++;
            远程地址 = new TextDecoder().decode(数据块.slice(地址值起始, 地址值起始 + 地址长度));
            break;
        case 3:
            地址长度 = 16;
            const 视图 = new DataView(数据块.slice(地址值起始, 地址值起始 + 地址长度));
            const 片段 = [];
            for (let i = 0; i < 8; i++) 片段.push(视图.getUint16(i * 2).toString(16));
            远程地址 = 片段.join(':');
            break;
        default:
            return { hasError: true, message: 错误_无效地址类型 };
    }

    if (!远程地址) return { hasError: true, message: 错误_空地址 };
    return {
        hasError: false, addressRemote: 远程地址, addressType: 地址类型, portRemote: 远程端口,
        rawDataIndex: 地址值起始 + 地址长度, wVersion: 版本, isUDP: 是否UDP命令
    };
}

async function 转发数据(远程套接字, 服务端, 版本头, 重试函数, 记录日志) {
    let 已发送头 = false, 版本头副本 = 版本头;
    await 远程套接字.readable.pipeTo(new WritableStream({
        async write(数据块, 控制器) {
            已发送头 = true;
            if (服务端.readyState !== 1) 控制器.error(日志_套接字关闭);
            if (版本头副本) {
                服务端.send(await new Blob([版本头副本, 数据块]).arrayBuffer());
                版本头副本 = null;
            } else {
                服务端.send(数据块);
            }
        },
        close() { 记录日志(`${日志_远程关闭} ${已发送头}`) },
        abort(原因) { console.error(日志_远程中止, 原因) }
    })).catch(错误 => {
        console.error(日志_传输错误, 错误.stack || 错误);
        关闭WebSocket(服务端);
    });
    if (已发送头 === false && 重试函数) 重试函数();
}

function 解码早期数据(字符串) {
    if (!字符串) return { error: null };
    try {
        字符串 = 字符串.replace(/-/g, '+').replace(/_/g, '/');
        const 二进制 = atob(字符串);
        const 字节数组 = Uint8Array.from(二进制, 字符 => 字符.charCodeAt(0));
        return { earlyData: 字节数组.buffer, error: null };
    } catch (错误) {
        return { error: 错误 };
    }
}

function 验证UUID(字符串) {
    const 正则 = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return 正则.test(字符串);
}

const 打开状态 = 1, 关闭状态 = 2;
function 关闭WebSocket(套接字) {
    try {
        if (套接字.readyState === 打开状态 || 套接字.readyState === 关闭状态) 套接字.close();
    } catch (错误) {
        console.error(日志_关闭错误, 错误);
    }
}

const 十六进制表 = [];
for (let i = 0; i < 256; i++) 十六进制表.push((i + 256).toString(16).slice(1));
function 字节转UUID字符串(字节数组, 偏移 = 0) {
    return (十六进制表[字节数组[偏移+0]] + 十六进制表[字节数组[偏移+1]] + 十六进制表[字节数组[偏移+2]] + 十六进制表[字节数组[偏移+3]] + "-" +
            十六进制表[字节数组[偏移+4]] + 十六进制表[字节数组[偏移+5]] + "-" +
            十六进制表[字节数组[偏移+6]] + 十六进制表[字节数组[偏移+7]] + "-" +
            十六进制表[字节数组[偏移+8]] + 十六进制表[字节数组[偏移+9]] + "-" +
            十六进制表[字节数组[偏移+10]] + 十六进制表[字节数组[偏移+11]] + 十六进制表[字节数组[偏移+12]] + 十六进制表[字节数组[偏移+13]] + 十六进制表[字节数组[偏移+14]] + 十六进制表[字节数组[偏移+15]]).toLowerCase();
}
function 验证并获取UUID(字节数组, 偏移 = 0) {
    const 字符串 = 字节转UUID字符串(字节数组, 偏移);
    if (!验证UUID(字符串)) throw TypeError(错误_无效标识字符串);
    return 字符串;
}

async function 处理UDP(服务端, 版本头, 记录日志) {
    let 已发送版本头 = false;
    const 转换流 = new TransformStream({
        transform(数据块, 控制器) {
            for (let i = 0; i < 数据块.byteLength; ) {
                const 长度字节 = 数据块.slice(i, i + 2);
                const 长度 = new DataView(长度字节).getUint16(0);
                const 负载 = new Uint8Array(数据块.slice(i + 2, i + 2 + 长度));
                i += 2 + 长度;
                控制器.enqueue(负载);
            }
        }
    });

    转换流.readable.pipeTo(new WritableStream({
        async write(查询数据) {
            const 响应 = await fetch(DNS服务器URL, {
                method: HTTP方法_POST, headers: { [内容类型头]: MIME_DNS }, body: 查询数据
            });
            const 应答数据 = await 响应.arrayBuffer();
            const 应答长度 = 应答数据.byteLength;
            const 长度头 = new Uint8Array([(应答长度 >> 8) & 0xff, 应答长度 & 0xff]);
            if (服务端.readyState === 1) {
                记录日志(`${日志_DNS成功} ${应答长度}`);
                if (!已发送版本头) {
                    服务端.send(await new Blob([版本头, 长度头, 应答数据]).arrayBuffer());
                    已发送版本头 = true;
                } else {
                    服务端.send(await new Blob([长度头, 应答数据]).arrayBuffer());
                }
            }
        }
    })).catch(错误 => 记录日志(日志_DNS错误 + 错误));

    const 写入器 = 转换流.writable.getWriter();
    return { write: 数据 => 写入器.write(数据) };
}
