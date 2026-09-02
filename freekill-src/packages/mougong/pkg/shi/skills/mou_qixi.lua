local mouQixi = fk.CreateSkill({
  name = "mou__qixi",
})

Fk:loadTranslationTable{
  ["mou__qixi"] = "奇袭",
  [":mou__qixi"] = "出牌阶段限一次，你可以选择一名其他角色，令其猜测你手牌中最多的花色。若猜错，你可以令该角色从未猜测过的花色中再次猜测；" ..
  "若猜对，你展示所有手牌。然后你弃置其区域内X张牌（X为此阶段该角色猜错的次数，不足则全弃）。",
  ["#mou__qixi-again"] = "奇袭：你可以令其再猜一次",
  ["#mou__qixi-guess"] = "奇袭：猜测%dest手牌中最多的花色",
  ["#mou__qixi-promot"] = "奇袭：您手牌中最多的花色为：%arg",

  ["$mou__qixi1"] = "击敌不备，奇袭拔寨！",
  ["$mou__qixi2"] = "轻羽透重铠，奇袭溃坚城！",
}

mouQixi:addEffect("active", {
  anim_type = "control",
  prompt = function(self, player)
    local numMap = {}
    for _, id in ipairs(player:getCardIds("h")) do
      local str = Fk:getCardById(id):getSuitString(true)
      if str ~= "log_nosuit" then
        numMap[str] = (numMap[str] or 0) + 1
      end
    end
    local max_num = 0
    for _, v in pairs(numMap) do
      max_num = math.max(max_num, v)
    end
    local suits = {}
    for suit, v in pairs(numMap) do
      if v == max_num then
        table.insert(suits, Fk:translate(suit))
      end
    end
    return "#mou__qixi-promot:::"..table.concat(suits, ",")
  end,
  can_use = function(self, player)
    return
      not player:isKongcheng() and
      player:usedSkillTimes(mouQixi.name, Player.HistoryPhase) == 0 and
      table.find(player:getCardIds("h"), function (id) return Fk:getCardById(id).suit ~= Card.NoSuit end)
  end,
  card_num = 0,
  card_filter = Util.FalseFunc,
  target_num = 1,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouQixi.name
    local player = effect.from
    local to = effect.tos[1]
    local suits = { "log_spade", "log_club", "log_heart", "log_diamond" }
    local numMap = {}
    for _, suit in ipairs(suits) do
      numMap[suit] = 0
    end
    for _, id in ipairs(player:getCardIds("h")) do
      local str = Fk:getCardById(id):getSuitString(true)
      if numMap[str] then
        numMap[str] = numMap[str] + 1
      end
    end
    local max_num = 0
    for _, v in pairs(numMap) do
      max_num = math.max(max_num, v)
    end
    local wrong_num = 0
    while #suits > 0 do
      local choice = room:askToChoice(to, { choices = suits, skill_name = skillName, prompt = "#mou__qixi-guess::" .. player.id })
      if numMap[choice] ~= max_num then
        wrong_num = wrong_num + 1
        table.removeOne(suits, choice)
        if #suits == 0 or not room:askToSkillInvoke(player, { skill_name = skillName, prompt = "#mou__qixi-again" }) then break end
      else
        if not player:isKongcheng() then
          player:showCards(player:getCardIds("h"))
        end
        break
      end
    end
    local throw_num = math.min(#to:getCardIds("hej"), wrong_num)
    if player.dead or throw_num == 0 then return end
    local throw = room:askToChooseCards(player, { target = to, min = throw_num, max = throw_num, flag = "hej", skill_name = skillName })
    room:throwCard(throw, skillName, to, player)
  end
})

return mouQixi
