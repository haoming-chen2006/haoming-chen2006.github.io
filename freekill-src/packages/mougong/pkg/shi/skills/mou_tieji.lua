local mouTieji = fk.CreateSkill({
  name = "mou__tieji",
})

Fk:loadTranslationTable{
  ["mou__tieji"] = "铁骑",
  [":mou__tieji"] = "每当你使用【杀】指定其他角色为目标后，你可令其不能响应此【杀】，且所有非锁定技失效直到回合结束。然后你与其进行谋弈。若你赢，且你选择的选项为：“直取敌营”，则你获得其一张牌；“扰阵疲敌”，你摸两张牌。",

  ["#mou__tieji-ask"] = "铁骑：是否令 %dest 不能响应，非锁定技失效，且与其进行谋弈",
  ["tieji-zhiqu"] = "直取敌营",
  ["tieji-raozheng"] = "扰阵疲敌",
  ["tieji-chuzheng"] = "出阵迎敌",
  ["tieji-huwei"] = "拱卫中军",
  [":tieji-zhiqu"] = "谋奕成功后，获得对方一张牌",
  [":tieji-raozheng"] = "谋奕成功后，你摸两张牌",
  [":tieji-chuzheng"] = "用于防御“直取敌营”(防止其获得你牌)",
  [":tieji-huwei"] = "用于防“御扰阵疲敌”(防止其摸两张牌)",

  ["$mou__tieji1"] = "厉马秣兵，只待今日！",
  ["$mou__tieji2"] = "敌军防备空虚，出击直取敌营！",
  ["$mou__tieji3"] = "敌军早有防备，先行扰阵疲敌！",
  ["$mou__tieji4"] = "全军速撤回营，以期再觅良机！",
}

local U = require "packages.utility.utility"

mouTieji:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouTieji.name) and
      data.to ~= player and
      data.card.trueName == "slash"
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = mouTieji.name, prompt = "#mou__tieji-ask::"..data.to.id,
    })
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouTieji.name
    local room = player.room
    local to = data.to
    room:notifySkillInvoked(player, skillName, "offensive", { to })
    player:broadcastSkillInvoke(skillName, 1)
    data:setDisresponsive(to)
    room:addPlayerMark(to, "@@tieji-turn")
    room:addPlayerMark(to, MarkEnum.UncompulsoryInvalidity .. "-turn")
    local choices = U.doStrategy(room, player, to, { "tieji-zhiqu", "tieji-raozheng" }, { "tieji-chuzheng", "tieji-huwei" }, skillName, 1)
    if choices[1] == "tieji-zhiqu" and choices[2] ~= "tieji-chuzheng" then
      player:broadcastSkillInvoke(skillName, 2)
      if not to:isNude() then
        local card = room:askToChooseCard(player, { target = to, flag = "he", skill_name = mouTieji.name })
        room:obtainCard(player, card, false, fk.ReasonPrey)
      end
    elseif choices[1] == "tieji-raozheng" and choices[2] ~= "tieji-huwei" then
      player:broadcastSkillInvoke(skillName, 3)
      player:drawCards(2, skillName)
    else
      player:broadcastSkillInvoke(skillName, 4)
    end
  end,
})

return mouTieji
