---
id: live
title: 实时视图
---

Frigate智能地在实时视图仪表板上显示您的摄像头流。默认情况下，Frigate采用"智能流媒体"技术，当没有检测到活动时，摄像头图像每分钟更新一次以节省带宽和资源。一旦检测到任何运动或活动对象，摄像头会无缝切换到实时流。

### 实时视图技术

Frigate智能地使用三种不同的流媒体技术在仪表板和单摄像头视图上显示您的摄像头流，根据网络带宽、播放器错误或双向通话等功能需求在不同可用模式间切换。要获得最高质量和流畅度的实时视图，需要按照[逐步指南](/guides/configuring_go2rtc)配置内置的`go2rtc`。

jsmpeg实时视图会消耗更多浏览器和客户端GPU资源。强烈推荐使用go2rtc，它能提供更优质的体验。

| 来源 | 帧率                              | 分辨率 | 音频                        | 需要go2rtc | 说明                                                                                                                                                               |
| ---- | --------------------------------- | ------ | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jsmpeg | 与`detect -> fps`相同，上限10fps | 720p   | 无                           | 否          | 分辨率可配置，但如需更高分辨率和更好帧率推荐使用go2rtc。未配置go2rtc时是Frigate的默认选项。 | 
| mse  | 原生                              | 原生   | 是(取决于音频编解码器)       | 是          | iPhone需要iOS 17.1+，Firefox仅支持h.264。配置go2rtc后是Frigate的默认选项。                              |
| webrtc | 原生                              | 原生   | 是(取决于音频编解码器)      | 是          | 需要额外配置，不支持h.265。当MSE失败或使用摄像头双向通话功能时，Frigate会尝试使用WebRTC。                   |

### 摄像头设置建议

如果使用go2rtc，应在摄像头固件中调整以下设置以获得最佳实时视图体验：

- 视频编解码器：**H.264** - 提供与所有实时视图技术和浏览器最兼容的视频编解码器。避免使用任何"智能编解码器"或"+"编解码器，如_H.264+_或_H.265+_，这些非标准编解码器会移除关键帧(见下文)。
- 音频编解码器：**AAC** - 提供与所有支持音频的实时视图技术和浏览器最兼容的音频编解码器。
- I帧间隔(有时称为关键帧间隔、帧间空间或GOP长度)：匹配摄像头的帧率，或选择"1x"(对于Reolink摄像头的帧间空间)。例如，如果您的流输出20fps，I帧间隔应为20(或Reolink上的1x)。高于帧率的值会导致流开始播放时间更长。有关关键帧的更多信息，请参阅[此页面](https://gardinal.net/understanding-the-keyframe-interval/)。对于许多用户来说这可能不是问题，但应注意1x I帧间隔会导致更多存储使用(如果同时将该流用于`record`角色)。

摄像头的默认视频和音频编解码器可能不总是与您的浏览器兼容，这就是为什么建议将它们设置为H.264和AAC。有关编解码器支持信息，请参阅[go2rtc文档](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#codecs-madness)。

### 音频支持

MSE需要PCMA/PCMU或AAC音频，WebRTC需要PCMA/PCMU或opus音频。如果想同时支持MSE和WebRTC，则需要在重流配置中确保两者都启用。

```yaml
go2rtc:
  streams:
    rtsp_cam: # <- RTSP流
      - rtsp://192.168.1.5:554/live0 # <- 支持视频和AAC音频的流
      - "ffmpeg:rtsp_cam#audio=opus" # <- 将音频转码为缺失编解码器(通常是opus)的流副本
    http_cam: # <- HTTP流
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- 支持视频和AAC音频的流
      - "ffmpeg:http_cam#audio=opus" # <- 将音频转码为缺失编解码器(通常是opus)的流副本
```

如果摄像头不支持AAC音频或实时视图有问题，尝试直接转码为AAC音频：

```yaml
go2rtc:
  streams:
    rtsp_cam: # <- RTSP流
      - "ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=aac" # <- 复制视频流并将音频转码为AAC
      - "ffmpeg:rtsp_cam#audio=opus" # <- 提供WebRTC支持
```

如果摄像头没有音频且实时视图有问题，应让go2rtc仅发送视频：

```yaml
go2rtc:
  streams:
    no_audio_camera:
      - ffmpeg:rtsp://192.168.1.5:554/live0#video=copy
```

### 为实时页面设置视频流

可以配置Frigate允许手动选择要在实时页面中查看的视频流。例如，您可能想在移动设备上查看摄像头的子流，而在桌面设备上查看全分辨率流。设置`live -> streams`列表将在页面的实时视图中填充一个下拉菜单，让您可以选择不同的流。此流设置是_每设备_的，并保存在浏览器的本地存储中。

此外，在界面中创建和编辑摄像头组时，可以选择要用于摄像头组实时仪表板的视频流。

:::note

Frigate的默认仪表板("所有摄像头")在播放摄像头实时流时将始终使用您在`streams:`中定义的第一个条目。

:::

使用"友好名称"后跟go2rtc流名称来配置`streams`选项。

使用Frigate内置版本的go2rtc是使用此功能的必要条件。不能在`streams`配置中指定路径，只能指定go2rtc流名称。

```yaml
go2rtc:
  streams:
    test_cam:
      - rtsp://192.168.1.5:554/live_main # <- 支持视频和AAC音频的流
      - "ffmpeg:test_cam#audio=opus" # <- 将音频转码为opus以支持webrtc的流副本
    test_cam_sub:
      - rtsp://192.168.1.5:554/live_sub # <- 支持视频和AAC音频的流
    test_cam_another_sub:
      - rtsp://192.168.1.5:554/live_alt # <- 支持视频和AAC音频的流

cameras:
  test_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/test_cam # <--- 这里的名称必须与重流中的摄像头名称匹配
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/test_cam_sub # <--- 这里的名称必须与重流中的camera_sub名称匹配
          input_args: preset-rtsp-restream
          roles:
            - detect
    live:
      streams: # <--- Frigate 0.16及更高版本支持多流
        主流: test_cam # <--- 指定"友好名称"后跟go2rtc流名称
        子流: test_cam_sub
        特殊流: test_cam_another_sub
```

### WebRTC额外配置：

WebRTC通过在端口`8555`上创建TCP或UDP连接工作。但是，它需要额外配置：

- 对于外部访问(通过互联网)，设置路由器将端口`8555`(TCP和UDP)转发到Frigate设备的端口`8555`。
- 对于内部/本地访问，除非通过HA插件运行，否则还需要在go2rtc配置中设置WebRTC候选列表。例如，如果`192.168.1.10`是运行Frigate设备的本地IP：

  ```yaml title="config.yml"
  go2rtc:
    streams:
      test_cam: ...
    webrtc:
      candidates:
        - 192.168.1.10:8555
        - stun:8555
  ```

- 对于通过Tailscale的访问，必须将Frigate系统的Tailscale IP添加为WebRTC候选。Tailscale IP都以`100.`开头，并保留在`100.64.0.0/10` CIDR块中。
- 注意WebRTC不支持H.265。

:::tip

如果Frigate已作为Home Assistant插件安装，可能不需要此额外配置，因为Frigate使用Supervisor的API生成WebRTC候选。

但是，如果出现问题，建议手动定义候选。如果Frigate插件未能生成有效候选，您应该这样做。如果发生错误，您将在初始化期间的插件日志页面中看到类似以下的警告：

```log
[WARN] 无法从supervisor获取IP地址
[WARN] 无法从supervisor获取WebRTC端口
```

:::

:::note

如果在让WebRTC工作时遇到困难，并且您正在使用docker运行Frigate，可以尝试更改容器网络模式：

- `network: host`，在此模式下不需要转发任何端口。Frigate容器内的服务将完全访问主机机器的网络接口，就像它们原生运行而不是在容器中一样。任何端口冲突都需要解决。go2rtc推荐此网络模式，但我们建议仅在必要时使用。
- `network: bridge`是默认网络驱动程序，桥接网络是转发网络段间流量的链路层设备。需要转发任何希望从主机IP访问的端口。

如果不在主机模式下运行，需要为容器映射端口8555：

docker-compose.yml

```yaml
services:
  frigate:
    ...
    ports:
      - "8555:8555/tcp" # WebRTC over tcp
      - "8555:8555/udp" # WebRTC over udp
```

:::

有关更多信息，请参阅[go2rtc WebRTC文档](https://github.com/AlexxIT/go2rtc/tree/v1.8.3#module-webrtc)。

### 双向通话

对于支持双向通话的设备，可以配置Frigate从Web UI的摄像头实时视图中使用该功能。您应该：

- 设置go2rtc与[WebRTC](#webrtc-extra-configuration)。
- 确保通过https访问Frigate(可能需要[打开端口8971](/frigate/installation/#端口))。
- 对于Home Assistant Frigate卡片，[按照文档](https://github.com/dermotduffy/frigate-hass-card?tab=readme-ov-file#using-2-way-audio)获取正确的源。

要使用Reolink门铃的双向通话，应使用[推荐的Reolink配置](/configuration/camera_specific#reolink摄像头)

### 摄像头组仪表板上的流媒体选项

Frigate在摄像头组编辑面板中提供了一个对话框，其中包含几个用于摄像头组仪表板上流媒体的选项。这些设置是_每设备_的，并保存在您设备的本地存储中。

- 使用`live -> streams`配置选项选择流(见上文_为实时UI设置流_)
- 流媒体类型：
  - _无流媒体_：摄像头图像每分钟仅更新一次，不会进行实时流媒体。
  - _智能流媒体_(默认，推荐设置)：当没有检测到活动时，智能流媒体每分钟更新一次摄像头图像以节省带宽和资源，因为静态图像与没有运动或对象的流媒体图像相同。当检测到运动或对象时，图像无缝切换到实时流。
  - _连续流媒体_：当在仪表板上可见时，摄像头图像始终是实时流，即使没有检测到活动。连续流媒体可能导致高带宽使用和性能问题。**谨慎使用。**
- _兼容模式_：仅当摄像头的实时流显示颜色伪影且图像右侧有对角线时才启用此选项。在启用之前，尝试将摄像头的`detect`宽度和高度设置为标准宽高比(例如：640x352变为640x360，800x443变为800x450，2688x1520变为2688x1512等)。根据您的浏览器和设备，可能不支持同时使用兼容模式的多个摄像头，因此只有在更改配置无法解决颜色伪影和对角线时才使用此选项。

:::note

默认仪表板("所有摄像头")将始终使用智能流媒体和您在`streams`配置中设置的第一个条目(如果已定义)。如果想更改这些默认设置中的任何一个，请使用摄像头组。

:::

### 禁用摄像头

可以通过Frigate页面和[MQTT](/integrations/mqtt#frigatecamera_nameenabledset)临时禁用摄像头以节省系统资源。禁用时，Frigate的ffmpeg进程终止 - 停止录制，暂停对象检测，实时仪表板显示禁用消息的空白图像。仍可通过UI访问禁用摄像头的回放条目、追踪对象和历史录像。

对于重流摄像头，go2rtc保持活动状态，但除非有外部客户端使用(如Home Assistant中的高级摄像头卡片使用go2rtc源)，否则不会使用系统资源进行解码或处理。

注意通过配置文件禁用摄像头(`enabled: False`)会移除所有相关UI元素，包括历史录像访问。要保留访问权限同时禁用摄像头，请在配置中保持启用状态，并使用UI或MQTT临时禁用它。

## 实时视图常见问题

1. **为什么我的实时视图中没有音频？**

   必须使用go2rtc才能在实时流中听到音频。如果已配置go2rtc，需要确保摄像头发送PCMA/PCMU或AAC音频。如果无法更改摄像头的音频编解码器，需要使用go2rtc[转码音频](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#source-ffmpeg)。

   请注意低带宽模式播放器是仅视频流。即使已设置go2rtc，也不应期望在低带宽模式下听到音频。

2. **Frigate显示我的实时流处于"低带宽模式"。这是什么意思？**

   Frigate根据多种因素(用户选择的模式如双向通话、摄像头设置、浏览器功能、可用带宽)智能选择实时流媒体技术，并优先尽可能快地显示摄像头流的最新实时视图。

   配置go2rtc后，实时视图最初尝试使用更清晰、流畅的流媒体技术(MSE)加载和播放流。初始超时、会导致流缓冲的低带宽条件或流中的解码错误将导致Frigate切换到由`detect`角色定义的流，使用jsmpeg格式。这就是UI标记为"低带宽模式"的内容。在实时仪表板上，当配置智能流媒体且活动停止时，模式会自动重置。连续流媒体模式没有自动重置机制，但可以使用_重置_选项强制重新加载流。

   如果使用连续流媒体或在仪表板上同时加载多个高分辨率流，浏览器可能在超时前难以开始播放流。Frigate始终优先尽可能快地显示实时流，即使是较低质量的jsmpeg流。可以使用"重置"链接/按钮尝试再次加载高分辨率流。

   如果Frigate仍然回退到低带宽模式，可能需要根据[上述建议](#camera_settings_recommendations)调整摄像头设置。

3. **我的摄像头似乎没有在实时仪表板上实时播放。为什么？**

   在默认实时仪表板("所有摄像头")上，当没有检测到活动时，摄像头图像每分钟更新一次以节省带宽和资源。一旦检测到任何活动，摄像头无缝切换到全分辨率实时流。如果想自定义此行为，请使用摄像头组。

4. **我在实时视图上看到一条奇怪的对角线，但我的录像看起来很好。如何修复？**

   这是由于`detect`宽度或高度设置不正确(或自动检测不正确)导致的，导致jsmpeg播放器的渲染引擎显示略微失真的图像。应将`detect`分辨率放大到标准宽高比(例如：640x352变为640x360，800x443变为800x450，2688x1520变为2688x1512等)。如果将分辨率更改为匹配标准(4:3、16:9或32:9等)宽高比无法解决问题，可以在摄像头组仪表板的流设置中启用"兼容模式"。根据您的浏览器和设备，可能不支持同时使用兼容模式的多个摄像头，因此只有在更改`detect`宽度和高度无法解决颜色伪影和对角线时才使用此选项。

5. **"智能流媒体"如何工作？**

   因为场景的静态图像看起来与没有运动或活动的实时流完全相同，智能流媒体在没有检测到活动时每分钟更新一次摄像头图像以节省带宽和资源。一旦发生任何活动(运动或对象/音频检测)，摄像头无缝切换到实时流。

   此静态图像从配置中`detect`角色定义的流中提取。当检测到活动时，`detect`流的图像立即开始以约5帧/秒的速度更新，以便您可以看到活动，直到实时播放器加载并开始播放。这通常只需要一两秒钟。如果实时播放器超时、缓冲或有流媒体错误，则加载jsmpeg播放器并从`detect`角色播放仅视频流。当活动结束时，销毁播放器并显示静态图像，直到再次检测到活动，然后重复此过程。

   智能流媒体依赖于正确调整摄像头的运动`threshold`和`contour_area`配置值。使用UI设置中的运动调谐器实时调整这些值。

   这是Frigate的默认和推荐设置，因为它能显著节省带宽，特别是对于高分辨率摄像头。

6. **我已取消静音某些仪表板上的摄像头，但听不到声音。为什么？**

   如果您的摄像头正在流媒体(如右上角的红点所示，或设置为连续流媒体模式)，您的浏览器可能会在您与页面交互前阻止音频播放。这是浏览器有意设计的限制。详见[这篇文章](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide#autoplay_availability)。许多浏览器都有白名单功能可以更改此行为。