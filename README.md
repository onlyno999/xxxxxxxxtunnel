

<div align="center">


</div>

## 功能特性

- 🚀 基于 Cloudflare Workers 

## 环境变量配置


##  workers 路径进阶用法

### 相关路径说明
<img width="700" height="600" alt="image" src="https://github.com/user-attachments/assets/86b3dd1d-bbca-4786-9bb3-430bf6700024" />

| 类型 | 示例 | 说明 |
|------|------|------|
| **默认路径** | `/?ed=2560` | 使用代码里设置的默认 `proxyip` |
| **域名 proxyip** | `/?ed=2560&proxyip=proxyip.domain.com` 或 `proxyip=proxyip.domain.com`  | 使用域名形式的 `proxyip` |
| **带端口的 proxyip** | `/?ed=2560&proxyip=ip:port` 或 `/proxyip=ip:port` | 使用带端口的 `proxyip` |
| **SOCKS5** | `/?ed=2560&proxyip=socks://user:pass@host:port` 或 `/proxyip=socks://user:pass@host:port` | 使用全局 SOCKS5 出站 协议头可为socks5 |
| **HTTP** | `/?ed=2560&proxyip=http://user:pass@host:port` 或 `/proxyip=http://user:pass@host:port` | 使用全局 HTTP/HTTPS 出站 |


## cloudns 双向解析域名部署snippets统一使用的域名前缀
```bash
_acme-challenge
```

## shadowsocks 节点参数对照图
节点path为SSpath变量或uuid开头，示例：`/5dc15e15-f285-4a9d-959b-0e4fbdd77b63/?ed=2560`   

带proxyip的示例：`/5dc15e15-f285-4a9d-959b-0e4fbdd77b63/?ed=2560&proxyip=xxxx`  v2rayN上设置全局socks5或http出站

小火箭示例: `/5dc15e15-f285-4a9d-959b-0e4fbdd77b63/proxyip=xxxx` 设置socks5或http全局出站,karing,nekobox一样设置


## 许可证

GPL 2.0
