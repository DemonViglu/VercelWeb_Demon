# 如何使用Docker作为跳板连接旧的服务器

## 1 

docker start ssh-jump

## 2

mkdir -p /workspace/legacy

sshfs -o ssh_command="ssh -F /root/.ssh-local/config -o UserKnownHostsFile=/root/.ssh-local/known_hosts" \
  Final:/cluster/home/gezhouyi/ /workspace/legacy \
  -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3,StrictHostKeyChecking=accept-new

## 3

ssh -F /root/.ssh-local/config Final

如果需要推出，输入exit

## 4 创建容器

docker run -d --name ssh-jump `
  --cap-add=SYS_ADMIN `
  --device /dev/fuse `
  -v "$env:USERPROFILE\.ssh:/root/.ssh:ro" `
  ubuntu:22.04 sleep infinity

## 5 挂载权限

rm -rf /root/.ssh-local
mkdir -p /root/.ssh-local
cp -a /root/.ssh/* /root/.ssh-local/ 2>/dev/null || true

chmod 700 /root/.ssh-local
chmod 600 /root/.ssh-local/* 2>/dev/null || true
find /root/.ssh-local -name "*.pub" -exec chmod 644 {} \; 2>/dev/null || true

## 6 

apt update
apt install -y sshfs openssh-client