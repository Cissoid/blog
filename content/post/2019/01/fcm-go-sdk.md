+++
date = 2019-01-10T16:05:34+08:00
title = "FCM Go SDK 代码结构解析"
categories = []
tags = ["FCM", "Go"]

[minimalism]
    cloudmusic = ""
    license = "by-nc-sa/4.0"
+++

最近工作中有接入 FCM 推送的需求, 因此对 Firebase SDK 的 FCM 相关代码做了一番调研.

首先, 来一段官方 demo:

```go
package main

import (
	"fmt"

	"context"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/messaging"

	"google.golang.org/api/option"
)

func main() {
	opt := option.WithCredentialsFile("service-account.json")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
        fmt.Println(err)
	}

	// Obtain a messaging.Client from the App.
	ctx := context.Background()
	client, err := app.Messaging(ctx)

	// This registration token comes from the client FCM SDKs.
	registrationToken := "YOUR_REGISTRATION_TOKEN"

	// See documentation on defining a message payload.
	message := &messaging.Message{
		Data: map[string]string{
			"score": "850",
			"time":  "2:45",
		},
		Token: registrationToken,
	}

	// Send a message to the device corresponding to the provided
	// registration token.
	response, err := client.Send(ctx, message)
	if err != nil {
        fmt.Println(err)
	}
	// Response is a message ID string.
	fmt.Println("Successfully sent message:", response)
}
```

# 证书解析

首先, 来看这一行代码

```go
    opt := option.WithCredentialsFile("service-account.json")
```

返回的 `opt` 是一个 interface, 定义如下:

```go
type ClientOption interface {
	Apply(*internal.DialSettings)
}
```

这个 interface 只有一个 Apply 方法, 接受一个 DialSettings 结构体的指针.
DialSettings 的定义如下:

```go
type DialSettings struct {
	Endpoint        string
	Scopes          []string
	TokenSource     oauth2.TokenSource
	Credentials     *google.DefaultCredentials
	CredentialsFile string // if set, Token Source is ignored.
	CredentialsJSON []byte
	UserAgent       string
	APIKey          string
	HTTPClient      *http.Client
	GRPCDialOpts    []grpc.DialOption
	GRPCConn        *grpc.ClientConn
	NoAuth          bool
}
```

在 package option 中对每一个字段都有一个对应的函数, 如 `option.WithEndpoint()`,
`option.WithScopes()` 等等, 这些函数都返回一个 ClientOption, 而调用 `ClientOption.Apply()`
方法的效果就是修改 DialSettings 中对应字段的值. 这样做的好处是, 可以使用多个
ClientOption 来修改一个 DialSettings 的不同字段.

因此, 如果调用上面的 `opt.Apply()` 方法, 会修改 `DialSettings.CredentialsFile` 字段.

# 创建 app

```go
    app, err := firebase.NewApp(context.Background(), nil, opt)
```

在 `NewApp` 内部做了许多操作, 但对于使用 FCM 有用的, 只有两处:

1. 解析 json 证书文件, 得到 project_id.
2. 除了第一步证书解析的 opt 外, 另增加一个修改 Scopes 的 `ClientOption`.

# 创建 Messaging client

```go
    client, err := app.Messaging(context.Background())
```

在 `app.Messaging()` 方法中可以看到实际上 FCM 推送的 client 只使用了 app 的 projectID
和 opts 两个字段:

```go
func (a *App) Messaging(ctx context.Context) (*messaging.Client, error) {
	conf := &internal.MessagingConfig{
		ProjectID: a.projectID,
		Opts:      a.opts,
		Version:   Version,
	}
	return messaging.NewClient(ctx, conf)
}
```

而在 `messaging.NewClient()` 函数中, 最重要的是调用 `transport.NewHTTPClient()`
这一步, 在这个函数里完成了 FCM 推送最关键的获取 access_token 以及发送请求时增加
`Authorizion` 的处理:

```go
func NewClient(ctx context.Context, c *internal.MessagingConfig) (*Client, error) {
	if c.ProjectID == "" {
		return nil, errors.New("project ID is required to access Firebase Cloud Messaging client")
	}

	hc, _, err := transport.NewHTTPClient(ctx, c.Opts...)
	if err != nil {
		return nil, err
	}

	return &Client{
		fcmEndpoint: messagingEndpoint,
		iidEndpoint: iidEndpoint,
		client:      &internal.HTTPClient{Client: hc},
		project:     c.ProjectID,
		version:     "Go/Admin/" + c.Version,
	}, nil
}
```

由于 `transport.NewHTTPClient()` 中有多层嵌套, 这里只捡重要的来看. 首先,
经过多个函数调用后, 走到 `google.golang.org/api/transport/http` package 的
`newTransport()` 函数这里:

```go
func newTransport(ctx context.Context, base http.RoundTripper, settings *internal.DialSettings) (http.RoundTripper, error) {
	trans := base
	trans = userAgentTransport{
		base:      trans,
		userAgent: settings.UserAgent,
	}
	trans = addOCTransport(trans)
	switch {
	case settings.NoAuth:
		// Do nothing.
	case settings.APIKey != "":
		trans = &transport.APIKey{
			Transport: trans,
			Key:       settings.APIKey,
		}
	default:
		creds, err := internal.Creds(ctx, settings)
		if err != nil {
			return nil, err
		}
		trans = &oauth2.Transport{
			Base:   trans,
			Source: creds.TokenSource,
		}
	}
	return trans, nil
}
```

由于使用的是 FCM 的 HTTP v1 接口, 因此这个 switch 判断会走到 default 这个 label.
这里做了两件事:

1. 使用 DialSettings 再次初始化了一个证书实例, 用于管理 access_token.
2. 创建了一个 oauth2 的 transport, 用于请求时附加 `Authorization` 头.

## 管理 access_token

`internal.Creds()` 方法经过一系列调用, 执行到 `golang.org/x/oauth2/google` package
的如下方法:

```go
func (f *credentialsFile) tokenSource(ctx context.Context, scopes []string) (oauth2.TokenSource, error) {
	switch f.Type {
	case serviceAccountKey:
		cfg := f.jwtConfig(scopes)
		return cfg.TokenSource(ctx), nil
	case userCredentialsKey:
		cfg := &oauth2.Config{
			ClientID:     f.ClientID,
			ClientSecret: f.ClientSecret,
			Scopes:       scopes,
			Endpoint:     Endpoint,
		}
		tok := &oauth2.Token{RefreshToken: f.RefreshToken}
		return cfg.TokenSource(ctx, tok), nil
	case "":
		return nil, errors.New("missing 'type' field in credentials")
	default:
		return nil, fmt.Errorf("unknown credential type: %q", f.Type)
	}
}
```

由于 `credentialsFile.Type` 的值为 `service_account` (查看 json 证书文件可以证明),
因此会走到这里:

```go
func (c *Config) TokenSource(ctx context.Context) oauth2.TokenSource {
	return oauth2.ReuseTokenSource(nil, jwtSource{ctx, c})
}
```

`oauth2.ReuseTokenSource()` 函数略去不表, 它的作用就是当 access_token 过期时重新生成一个.
而真正获取 access_token 是在 `jwtSource.Token()` 方法中处理. 代码太多就不贴了,
可以看 [这里](https://github.com/golang/oauth2/blob/master/jwt/jwt.go).

## 请求时的处理

上一步生成的 `TokenSource` 被传给了 `oauth2.Transport`. 在 `Transport.RoundTrip()` 方法中,
就会调用 `TokenSource.Token()` 方法来获取 access_token 了.

```go
func (t *Transport) RoundTrip(req *http.Request) (*http.Response, error) {
    // 省略部分代码

	if t.Source == nil {
		return nil, errors.New("oauth2: Transport's Source is nil")
	}
	token, err := t.Source.Token()
	if err != nil {
		return nil, err
	}

	req2 := cloneRequest(req) // per RoundTripper contract
	token.SetAuthHeader(req2)
	t.setModReq(req, req2)
	res, err := t.base().RoundTrip(req2)

    // 省略部分代码
}
```

# 发送请求

无非就是 json 序列化, 然后使用上面的 transport 对 HTTP 请求进行处理并发送罢了.

# 问题

在 [Firebase 文档](https://firebase.google.com/docs/cloud-messaging/migrate-v1) 中,
有说到在获取 access_token 时需要
`https://www.googleapis.com/auth/firebase.messaging` 这个 scope,
但我在代码中似乎并没有找到相关处理?
