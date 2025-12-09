# Tips

## 新建文件夹

        mkdir DIR_NAME_1 DIR_NAME_2

## Rename

```
    将目录A重命名为B

    mv A B

    例子：将/a目录移动到/b下，并重命名为c

    mv /a /b/c

    其实在文本模式中要重命名文件或目录，只需要使用mv命令就可以了，比如说要将一个名为abc的文件重命名为1234：

    mv abc 1234
```

## 解压

        unzip file.zip

??? note "如果你没有unzip怎么办"
    在终端中输入命令：
    ```
        apt-get install zip
    ```

## 查看当前路径下各文件夹大小

- 利用du命令（disk usage）
```
    du -sh // 查看当前目录总共占的容量，而不单独列出各子项占用的容量；
    du -sh ./* // 单独列出各子项占用的容量。
```
以上命令需要在root权限下操作，或者在命令行前加sudo命令也可以。

用到了两个参数来控制命令du：

-h：以K，M，G为单位，提高信息的可读性
-s：仅显示总计

## 查看磁盘剩余空间

- 利用df命令
```
    df -hl [目录名] ：查看磁盘剩余空间
```

## 报错 GLIBC 版本问题

!!! warning ""
    Installer requires GLIBC >=2.28, but system has 2.17.

- 更换Anaconda版本即可. 比如笔者使用 *https://repo.anaconda.com/miniconda/Miniconda3-py38_4.12.0-Linux-x86_64.sh* 老版本即可.

## 删文件

        rm FILE_NAME

## 模仿浏览器下载文件

??? note "查看完整代码"
    ```  python
        import argparse
        import requests
        import os
        import sys
        import time
        from urllib.parse import urlparse, parse_qs

        # Format File Size
        def format_size(bytes_size):
            if bytes_size < 1024:
                return f"{bytes_size:.1f} B"
            elif bytes_size < 1024 * 1024:
                return f"{bytes_size / 1024:.1f} KB"
            elif bytes_size < 1024 * 1024 * 1024:
                return f"{bytes_size / (1024 * 1024):.2f} MB"
            else:
                return f"{bytes_size / (1024 * 1024 * 1024):.2f} GB"

        # Format Time
        def format_time(seconds):
            if seconds < 60:
                return f"{seconds:.0f}秒"
            elif seconds < 3600:
                minutes = seconds / 60
                return f"{minutes:.1f}分钟"
            else:
                hours = seconds / 3600
                return f"{hours:.1f}小时"

        def main():
            parser = argparse.ArgumentParser(description='demon\'s download tool')
            parser.add_argument('url', help='download url')
            parser.add_argument('-o', '--output', help='out put filename')
            
            args = parser.parse_args()
            
            # Get output FileName
            if args.output:
                filename = args.output
            else:
                if 'sfile=' in args.url:
                    parsed = urlparse(args.url)
                    query = parse_qs(parsed.query)
                    if 'sfile' in query:
                        sfile_value = query['sfile'][0]
                        filename = sfile_value.split('/')[-1]
                    else:
                        filename = 'download.tar.bz2'
                else:
                    filename = args.url.split('/')[-1].split('?')[0]
                    if not filename or filename == 'download.php':
                        filename = 'download.tar.bz2'
            
            print(f"Save as: {filename}")
            
            # Set Nessary Header
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://amass.is.tue.mpg.de/',
                'Accept': '*/*',
            }
            
            try:
                response = requests.get(args.url, headers=headers, stream=True, timeout=30)
                response.raise_for_status()
                
                content_type = response.headers.get('content-type', '').lower()
                
                if 'html' in content_type:
                    print("[Warning] It's HTML File.")
                
                total_size = int(response.headers.get('content-length', 0))
                total_size_mb = total_size / (1024 * 1024)
                
                if total_size > 0:
                    print(f"文件大小: {format_size(total_size)} ({total_size_mb:.2f} MB)")
                else:
                    print("文件大小: 未知")
                
                print("-" * 60)
                
                # 下载参数
                downloaded = 0
                start_time = time.time()
                
                # 速度计算相关（与进度分离）
                last_speed_time = start_time
                last_speed_downloaded = 0
                SPEED_INTERVAL = 1  # 速度计算频率
                current_speed_mbps = 0.0
                
                # 用于跟踪显示频率（避免过度刷新）
                last_display_time = start_time
                DISPLAY_INTERVAL = 0.038  # 最小显示间隔，避免太卡
                
                with open(filename, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            
                            current_time = time.time()
                            
                            # 1. 计算下载速度（每0.5秒计算一次）
                            if current_time - last_speed_time >= SPEED_INTERVAL:
                                time_diff = current_time - last_speed_time
                                downloaded_diff = downloaded - last_speed_downloaded
                                
                                if time_diff > 0:
                                    speed_bps = downloaded_diff / time_diff
                                    current_speed_mbps = speed_bps / (1024 * 1024)
                                
                                last_speed_time = current_time
                                last_speed_downloaded = downloaded
                            
                            # 2. 实时更新进度显示（但限制刷新频率避免卡顿）
                            if current_time - last_display_time >= DISPLAY_INTERVAL:
                                downloaded_mb = downloaded / (1024 * 1024)
                                
                                if total_size > 0:
                                    # 确保下载完成时显示100%
                                    if downloaded >= total_size:
                                        percent = 100.0
                                    else:
                                        percent = downloaded / total_size * 100
                                    
                                    remaining_mb = (total_size - downloaded) / (1024 * 1024)
                                    
                                    # 估算剩余时间（使用当前速度）
                                    if current_speed_mbps > 0 and downloaded < total_size:
                                        remaining_time = remaining_mb / current_speed_mbps
                                        time_str = format_time(remaining_time)
                                    elif downloaded >= total_size:
                                        time_str = "完成!"
                                    else:
                                        time_str = "未知"
                                    
                                    # 进度条（实时）
                                    bar_length = 30
                                    if downloaded >= total_size:
                                        filled_length = bar_length  # 完成时充满
                                    else:
                                        filled_length = int(bar_length * downloaded // total_size)
                                    bar = '█' * filled_length + '░' * (bar_length - filled_length)
                                    
                                    # 清空行并输出
                                    sys.stdout.write('\r')
                                    sys.stdout.write(
                                        f'[{bar}] {percent:6.2f}% | '
                                        f'{downloaded_mb:7.2f}/{total_size_mb:7.2f} MB | '
                                        f'{current_speed_mbps:6.2f} MB/s | '
                                        f'剩余: {time_str:<8}'
                                    )
                                else:
                                    # 文件大小未知的情况
                                    sys.stdout.write('\r')
                                    sys.stdout.write(
                                        f'已下载: {downloaded_mb:7.2f} MB | '
                                        f'速度: {current_speed_mbps:6.2f} MB/s | '
                                        f'时间: {current_time - start_time:.0f}s'
                                    )
                                
                                sys.stdout.flush()
                                last_display_time = current_time
                
                # 下载完成后确保显示100%
                if total_size > 0:
                    downloaded_mb = downloaded / (1024 * 1024)
                    bar = '█' * 30  # 完整的进度条
                    sys.stdout.write('\r')
                    sys.stdout.write(
                        f'[{bar}] {100.00:6.2f}% | '
                        f'{downloaded_mb:7.2f}/{total_size_mb:7.2f} MB | '
                        f'完成!{"":<20}'
                    )
                    sys.stdout.flush()
                
                print()  # 换行
                print("-" * 60)
                
                # 下载完成后的统计
                end_time = time.time()
                total_time = end_time - start_time
                downloaded_mb = downloaded / (1024 * 1024)
                
                if total_time > 0:
                    avg_speed_mbps = downloaded_mb / total_time
                    print(f"下载时间: {format_time(total_time)} ({total_time:.1f} 秒)")
                    print(f"平均速度: {avg_speed_mbps:.2f} MB/s")
                
                # 验证文件
                if downloaded > 0:
                    with open(filename, 'rb') as f:
                        first_bytes = f.read(100)
                        if b'<!DOCTYPE html>' in first_bytes or b'<html>' in first_bytes:
                            print("\n警告: 文件似乎是HTML而不是压缩包")
                else:
                    print("错误: 下载的文件大小为0")
                    
            except requests.exceptions.RequestException as e:
                print(f"\n✗ 网络错误: {e}")
                sys.exit(1)
            except KeyboardInterrupt:
                print("\n\n下载被用户中断")
                # 显示已下载的部分
                if 'downloaded' in locals() and downloaded > 0:
                    downloaded_mb = downloaded / (1024 * 1024)
                    print(f"已下载: {format_size(downloaded)} ({downloaded_mb:.2f} MB)")
                sys.exit(1)
            except Exception as e:
                print(f"\n✗ 错误: {e}")
                sys.exit(1)

        if __name__ == '__main__':
            main()
    ```