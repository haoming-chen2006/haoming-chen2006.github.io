
local lishui = fk.CreateSkill {
  name = "lishui",
}

Fk:loadTranslationTable{
  ["lishui"] = "理说",
  [":lishui"] = "当你成为黑色牌的目标后，你可以摸一张牌与未还牌的“万利”角色拼点：若你赢，其提前一轮还牌。",

  ["#lishui-invoke"] = "理说：你可以摸一张牌，与 %dest 拼点，若赢，其提前一轮还牌（当前是第%arg轮还牌）",
}

lishui:addEffect(fk.TargetConfirmed, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lishui.name) and
      data.card.color == Card.Black and player:getMark("wanli") ~= 0
  end,
  on_cost = function (self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = lishui.name,
      prompt = "#lishui-invoke::"..player:getMark("wanli")[1].id..":"..player:getMark("wanli")[3],
    }) then
      event:setCostData(self, { tos = { player:getMark("wanli")[1] } })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = player:getMark("wanli")[1]
    player:drawCards(1, lishui.name)
    if player:getMark("wanli_wake") ~= 0 or not player:canPindian(to) then return end
    local pindian = player:pindian({ to }, lishui.name)
    if pindian.results[to].winner == player and not player.dead then
      local mark = player:getMark("wanli")
      mark[3] = math.max(mark[3] - 1, 0)
      room:setPlayerMark(player, "wanli", mark)
    end
  end,
})

return lishui
