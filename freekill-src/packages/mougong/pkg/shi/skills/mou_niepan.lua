local mouNiepan = fk.CreateSkill({
  name = "mou__niepan",
  tags = { Skill.Limited },
})

Fk:loadTranslationTable{
  ["mou__niepan"] = "涅槃",
  [":mou__niepan"] = "限定技，当你处于濒死状态时，你可以弃置区域里的所有牌，复原你的武将牌，然后摸两张牌并将体力回复至2点，最后修改〖连环〗。<br>"..
  "<b>连环·修改：</b>出牌阶段，你可以将一张♣手牌当【铁索连环】使用（每个出牌阶段限一次）或重铸；你使用【铁索连环】可以额外指定任意名角色为目标；"..
  "当你使用【铁索连环】指定一名角色为目标后，若其未横置，你随机弃置其一张手牌。",

  ["$mou__niepan1"] = "凤雏涅槃，只为再生！",
  ["$mou__niepan2"] = "烈火焚身，凤羽更丰！",
}

mouNiepan:addEffect(fk.AskForPeaches, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouNiepan.name) and
      player.dying and
      player:usedSkillTimes(mouNiepan.name, Player.HistoryGame) == 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:throwAllCards("hej")
    if player.dead then return end
    player:reset()
    player:drawCards(2, self.name)
    if not player.dead and player:isWounded() then
      room:recover({
        who = player,
        num = math.min(2, player.maxHp) - player.hp,
        recoverBy = player,
        skillName = mouNiepan.name,
      })
    end
    room:addPlayerMark(player, "mou__lianhuan_levelup")
  end,
})

return mouNiepan
