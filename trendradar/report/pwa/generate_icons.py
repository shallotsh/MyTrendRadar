#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PWA 图标生成工具

从源图标生成所需的各种尺寸图标
使用方法：python generate_icons.py <源图标路径>
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("请先安装 Pillow: pip install Pillow")
    sys.exit(1)


# 图标尺寸列表
ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# 图标输出目录
OUTPUT_DIR = Path(__file__).parent / "icons"


def generate_icons(source_path: Path, output_dir: Path = OUTPUT_DIR):
    """
    从源图标生成各种尺寸的图标

    Args:
        source_path: 源图标文件路径
        output_dir: 输出目录
    """
    if not source_path.exists():
        print(f"错误: 源文件不存在: {source_path}")
        return False

    # 创建输出目录
    output_dir.mkdir(parents=True, exist_ok=True)

    # 打开源图标
    try:
        source = Image.open(source_path)

        # 如果是 RGBA 模式，转换为 RGBA 以支持透明度
        if source.mode != 'RGBA':
            source = source.convert('RGBA')

        print(f"源图标: {source_path}")
        print(f"尺寸: {source.size}")
        print(f"模式: {source.mode}")
        print()

        # 生成各种尺寸的图标
        for size in ICON_SIZES:
            # 使用 LANCZOS 算法进行高质量缩放
            resized = source.resize((size, size), Image.LANCZOS)

            # 保存图标
            output_path = output_dir / f"icon-{size}x{size}.png"
            resized.save(output_path, "PNG")
            print(f"✓ 生成: {output_path.name} ({size}x{size})")

        print()
        print(f"完成！图标已保存到: {output_dir}")
        return True

    except Exception as e:
        print(f"错误: 处理图标时出错: {e}")
        return False


def create_default_icon(output_dir: Path = OUTPUT_DIR):
    """
    创建默认的 TrendRadar 图标

    Args:
        output_dir: 输出目录
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # 为每个尺寸创建图标
    for size in ICON_SIZES:
        # 创建图像
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

        # 绘制圆角矩形背景
        draw = ImageDraw.Draw(img)

        # 渐变背景（简化为纯色）
        background_color = (79, 70, 229, 255)  # #4f46e5

        # 绘制圆角矩形
        corner_radius = size // 5
        draw.rounded_rectangle(
            [(0, 0), (size, size)],
            radius=corner_radius,
            fill=background_color
        )

        # 绘制简单的 T 字母（代表 TrendRadar）
        text_color = (255, 255, 255, 255)
        font_size = int(size * 0.5)

        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            # 如果找不到字体，使用默认字体
            font = ImageFont.load_default()

        # 计算文本位置（居中）
        text = "T"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (size - text_width) // 2
        y = (size - text_height) // 2 - int(size * 0.05)

        draw.text((x, y), text, fill=text_color, font=font)

        # 保存图标
        output_path = output_dir / f"icon-{size}x{size}.png"
        img.save(output_path, "PNG")
        print(f"✓ 生成: {output_path.name} ({size}x{size})")

    print()
    print(f"默认图标已保存到: {output_dir}")


def main():
    """主函数"""
    if len(sys.argv) > 1:
        source_path = Path(sys.argv[1])
        generate_icons(source_path)
    else:
        print("PWA 图标生成工具")
        print("=" * 40)
        print()
        print("使用方法:")
        print(f"  python {sys.argv[0]} <源图标路径>")
        print()
        print("示例:")
        print(f"  python {sys.argv[0]} my-icon.png")
        print()
        print("或者创建默认的 TrendRadar 图标:")
        print(f"  python {sys.argv[0]} --default")
        print()

        if "--default" in sys.argv:
            print("正在生成默认图标...")
            print()
            create_default_icon()


if __name__ == "__main__":
    main()
