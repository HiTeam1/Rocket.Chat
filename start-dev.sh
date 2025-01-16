if [ $# -eq 0 ]; then
    echo "Usage: start-dev.sh DB_NAME [debug]"
    echo "Please provide db name"
    exit 1
fi

DBNAME=$1
echo "Connectin to db=$DBNAME"

export PORT=3000
export ROOT_URL="http://localhost:3000"

export MONGO_URL="mongodb://localhost:27017/$DBNAME?replicaSet=rs0"
export MONGO_OPLOG_URL="mongodb://localhost:27017/local?replicaSet=rs0"


# export OVERWRITE_SETTING_Accounts_SystemBlockedUsernameList=administrator,system,user
export OVERWRITE_SETTING_Show_Setup_Wizard=completed




OVERWRITE_SETTING_Show_Setup_Wizard=completed DEBUG=ioredis:* meteor
