local mouDuanliang = fk.CreateSkill({
  name = "mou__duanliang",
})

Fk:loadTranslationTable{
  ["mou__duanliang"] = "断粮",
  [":mou__duanliang"] = "出牌阶段限一次，你可以与一名其他角色进行一次“谋弈”：<br>围城断粮，你将牌堆顶的一张牌当无距离限制的【兵粮寸断】对其使用，若无法使用改为你获得其一张牌；<br>擂鼓进军，你视为对其使用一张【决斗】。",
  ["#mou__duanliang"] = "断粮：与一名其他角色进行“谋弈”，视为对其使用【兵粮寸断】或【决斗】",
  ["mou__duanliang-weicheng"] = "围城断粮",
  ["mou__duanliang-jinjun"] = "擂鼓进军",
  ["mou__duanliang-tuji"] = "全军突击",
  ["mou__duanliang-shoucheng"] = "闭门守城",
  [":mou__duanliang-weicheng"] = "谋奕成功后，视为使用【兵粮寸断】，若无法使用改为获得其一张牌",
  [":mou__duanliang-jinjun"] = "谋奕成功后，视为使用【决斗】",
  [":mou__duanliang-tuji"] = "用于防御围城断粮：防止其对你使用【兵粮寸断】或获得你一张牌",
  [":mou__duanliang-shoucheng"] = "用于防御擂鼓进军：防止其对你使用【决斗】",

  ["$mou__duanliang1"] = "常读兵法，终有良策也！",
  ["$mou__duanliang2"] = "烧敌粮草，救主于危急！",
  ["$mou__duanliang3"] = "敌陷混乱之机，我军可长驱直入！",
  ["$mou__duanliang4"] = "敌既识破吾计，则断不可行矣！",
}

local U = require "packages.utility.utility"

mouDuanliang:addEffect("active", {
  anim_type = "control",
  mute = true,
  prompt = "#mou__duanliang",
  can_use = function(self, player)
    return player:usedSkillTimes(self.name, Player.HistoryPhase) < 1
  end,
  card_num = 0,
  card_filter = Util.FalseFunc,
  target_num = 1,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local to = effect.tos[1]
    ---@type string
    local skillName = mouDuanliang.name
    room:notifySkillInvoked(player, skillName)
    player:broadcastSkillInvoke(skillName, 1)
    local choices = U.doStrategy(
      room,
      player,
      to,
      {"mou__duanliang-weicheng", "mou__duanliang-jinjun"},
      {"mou__duanliang-tuji", "mou__duanliang-shoucheng"},
      skillName,
      1
    )
    if choices[1] == "mou__duanliang-weicheng" and choices[2] ~= "mou__duanliang-tuji" then
      player:broadcastSkillInvoke(skillName, 2)
      local use
      if #room.draw_pile > 0 then
        local id = room.draw_pile[1]
        local card = Fk:cloneCard("supply_shortage")
        card.skillName = skillName
        card:addSubcard(id)
        if player:canUseTo(card, to, { bypass_times = true, bypass_distances = true }) then
          room:useVirtualCard("supply_shortage", {id}, player, to, skillName, true)
          use = true
        end
      end
      if not use and not to:isNude() then
        local id = room:askToChooseCard(player, { target = to, flag = "he", skill_name = skillName })
        room:obtainCard(player, id, false, fk.ReasonPrey)
      end
    elseif choices[1] == "mou__duanliang-jinjun" and choices[2] ~= "mou__duanliang-shoucheng" then
      player:broadcastSkillInvoke(skillName, 3)
      room:useVirtualCard("duel", nil, player, to, skillName)
    else
      player:broadcastSkillInvoke(skillName, 4)
    end
  end,
})

return mouDuanliang
