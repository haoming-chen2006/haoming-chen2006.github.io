local skill = fk.CreateSkill {
  name = "yanxiao_trick_skill",
}

skill:addEffect("cardskill", {
  prompt = "#yanxiao_trick_skill",
  can_use = Util.CanUse,
})

return skill
