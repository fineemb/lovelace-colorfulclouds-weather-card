<!--
 * @Author        : fineemb
 * @Github        : https://github.com/fineemb
 * @Description   : 
 * @Date          : 2020-02-16 22:33:53
 * @LastEditors   : fineemb
 * @LastEditTime  : 2020-10-02 16:53:00
 -->

# Lovelace Colorfulclouds Weather Card

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

这是一个适用于[彩云天气集成](https://github.com/fineemb/Colorfulclouds-weather)的Lovelace卡片

+ 支持15天天气预报的展示
+ 支持小时详细预报
+ 支持降雨量和云量以及温度的可视化效果

## 更新

+ v1.0

  + 首次发布

+ v1.1

  + 合并小时预报
  + 修正气压单位问题
  + 增加前端UI配置卡片
  + 更新小时预报UI
  + 可自定义第三方的图标集

  
## 预览
![](01.gif)

## HACS 安装

搜索Colorfulclouds weather card, 或者手动添加地址安装

## 配置

使用HACS安装后，可以在前端`编辑仪表盘-右下角+按钮` 添加和配置卡片
小时预报中的三个条状信息：
+ 第一条是温度，会根据这个时间段内的温差来显示不同的颜色
+ 第二条是云量，越蓝云层越多，反之越白
+ 第三条是降雨，颜色越深雨越大