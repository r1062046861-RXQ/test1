# 游戏卡牌资源包

本资源包包含《药灵无双》的所有85张卡牌的占位图及相关数据文件。

## 目录结构

```
public/
  cards_new/          # 存放所有生成的卡牌占位图 (86.png - 170.png)
  cards_mapping.json  # 卡牌编号与名称的映射文件
generate_cards.py     # 自动生成脚本
design.txt            # 卡牌设计源文档
```

## 文件说明

1.  **卡牌占位图 (`cards_new/`)**:
    *   文件格式：PNG (透明背景)
    *   分辨率：512x768 像素
    *   DPI：300
    *   命名规则：从 86 开始连续编号 (如 `86.png`)
    *   内容：包含卡牌名称、类型、消耗、描述及中医知识，预留了插画区域。

2.  **映射清单 (`cards_mapping.json`)**:
    *   JSON格式，记录了每个ID对应的卡牌名称、文件名、类型和消耗。
    *   用途：程序可通过读取此文件，将卡牌ID与美术资源关联。

3.  **生成脚本 (`generate_cards.py`)**:
    *   环境要求：Python 3.x, Pillow 库 (`pip install Pillow`)
    *   功能：读取同目录下的 `design.txt`，自动解析并在 `public/cards_new` 中重新生成所有图片。
    *   使用方法：
        ```bash
        python generate_cards.py
        ```

## 后续添加卡牌

若需新增卡牌：
1.  在 `design.txt` 末尾按照现有格式添加新卡牌的描述。
2.  重新运行 `python generate_cards.py`。
3.  脚本会自动识别新卡牌并生成后续编号的图片。

## 注意事项

*   脚本默认使用 Windows 系统字体 (SimHei 或 Microsoft YaHei) 以支持中文显示。如果在非 Windows 环境下运行，可能需要修改脚本中的字体路径。
