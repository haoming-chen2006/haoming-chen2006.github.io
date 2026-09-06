local util = {}

-- util.url = "https://cdn.jsdelivr.net/gh/EstKngAdone/pic@master/images/"
util.vanshang_url = "https://cnb.cool/Vanshang-Org/pic/-/git/raw/main/images/"

---便携添加皮肤的方式
---@param extension Package
---@param generals string | string[]
---@param names string | string[]
---@param translations? string | string[]
---@param url string?
util.addSkinNames = function (extension, names, generals, translations, url)
  local g = type(generals) == "table" and generals or {generals}
  local n = type(names) == "table" and names or {names}
  local t = type(translations) == "table" and translations or {translations}
  local _url = url or util.vanshang_url
  extension:addSkinPackage{
    url = _url,
    content = {
      {
        enabled_generals = g,
        skins = n
      },
    }
  }
  for i, name in ipairs(n) do
    Fk:loadTranslationTable{ [name] = t[i] or "" }
  end
end

---直接传入一个url来添加皮肤
---@param extension Package
---@param url string
---@param generals string | string[]
---@param translation any?
util.addSkinUrl = function (extension, url, generals, translation)
  local g = type(generals) == "table" and generals or {generals}
  local url_clips = string.split(url, "/")
  local skin_name = url_clips[#url_clips]
  table.remove(url_clips, #url_clips)
  local _url = table.concat(url_clips, "/") .. "/"

  extension:addSkinPackage{
    url = _url,
    content = {
      {
        enabled_generals = g,
        skins = {skin_name}
      },
    }
  }
  Fk:loadTranslationTable{ [skin_name] = translation or "" }
end

--- 骨骼信息
---@class SkeletonUrlSpec
---@field skin_name string @ 皮肤名（用于区分不同皮肤）
---@field url string @ 链接地址
---@field bg? string @ 背景
---@field body? string @ 人物
---@field front? string @ 前景（暂时无用）
---@field generals string[] @ 启动的武将名
---@field translation? string @ 皮肤名翻译
---@field files string[] @ 包含的文件名
---@field extra_data? SkeletonExtraDataSpec @ 额外参数，调整皮肤到合适位置和大小

--- 添加骨骼
---@param extension Package
---@param spec SkeletonUrlSpec
util.addSkelectonUrl = function (extension, spec)
  local skin_name = spec.skin_name
  local url = spec.url
  local bg = spec.bg or "BeiJing"
  local body = spec.body or "XingXiang"
  local front = spec.front or "QianJing"
  local generals = spec.generals
  local files = spec.files
  extension:addSkinPackage{
    url = url,
    content = { ---@type SkelSkinPackageContent[]
      {
        skin_name = skin_name,
        enabled_generals = generals,
        files = files,
        bg = bg,
        body = body,
        extra_data = spec.extra_data or {},
      },
    }
  }
  Fk:loadTranslationTable{ [skin_name] = spec.translation or "" }
end

---@param str string
---@param num? integer
---@return string[]
util.toSFs = function (str, num)
  local arr = {}
  num = num or 1
  for i = 1, num do
    if i == 1 then
      table.insert(arr, str .. ".skel")
      table.insert(arr, str .. ".atlas")
      table.insert(arr, str .. ".png")
    else
      table.insert(arr, str .. i .. ".png")
    end
  end
  return arr
end

---@param str string
---@param num? integer
---@return string[]
util.toJFs = function (str, num)
  local arr = {}
  num = num or 1
  for i = 1, num do
    if i == 1 then
      table.insert(arr, str .. ".json")
      table.insert(arr, str .. ".atlas")
      table.insert(arr, str .. ".png")
    else
      table.insert(arr, str .. num .. ".png")
    end
  end
  return arr
end

---传入一个表，生成一堆文件名
---@param spec table<string, integer> @ 传入类似于"XingXiang", "BeiJing"这样的名字
---@param type? string @ "skel"二进制文件或"json"，默认为skel
---@return table
util.toFiles = function (spec, type)
  local arr = {}
  local func = (type or "skel") == "skel" and util.toSFs or util.toJFs
  for k, v in pairs(spec) do
    table.insertTable(arr, func(k, v))
  end
  return arr
end

function util.split(str, delimiter)
    if delimiter == nil or delimiter == "" then
        error("分隔符不能为空")
    end
    
    local result = {}
    local from = 1
    -- 用 utf8.len 获取字符长度
    local str_len = utf8.len(str)
    
    while from <= str_len do
        local found = false
        -- 在剩余字符串中查找分隔符
        for i = from, str_len do
            local byte_pos = utf8.offset(str, i)  -- 获取第 i 个字符的字节位置
            -- 检查从 i 开始是否匹配 delimiter
            if string.sub(str, byte_pos, byte_pos + #delimiter - 1) == delimiter then
                -- 找到了，提取前面的部分
                local end_byte = utf8.offset(str, i) - 1
                if end_byte < 1 then
                    table.insert(result, "")
                else
                    table.insert(result, string.sub(str, from, end_byte))
                end
                from = i + utf8.len(delimiter)  -- 按字符数前进
                found = true
                break
            end
        end
        
        if not found then
            -- 没找到分隔符，剩下所有内容作为一个元素
            table.insert(result, string.sub(str, utf8.offset(str, from) or #str + 1))
            break
        end
    end
    
    return result
end

return util