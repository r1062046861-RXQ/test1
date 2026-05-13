import os
from openai import OpenAI

audio_path = r"c:\Users\C2H6O\Desktop\wechatgame\未使用\root\醴泉一路69号 6.m4a"
output_path = os.path.splitext(audio_path)[0] + ".txt"

client = OpenAI()

with open(audio_path, "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="zh",
    )

text = transcript.text
print("=== 转写结果 ===")
print(text)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(text)

print(f"\n已保存到: {output_path}")
